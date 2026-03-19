

# Failed Login Monitoring for Puzzle Lab

## Overview
Add lightweight failed-login logging, an admin panel to view attempts, and an IP blocklist system. All logic is server-side via edge functions; the admin UI is a new page in the existing private admin area.

---

## Step 1: Database Tables

Create two tables via migration:

**`failed_login_attempts`**
- `id` (uuid, PK, default gen_random_uuid())
- `attempted_name` (text) — exact puzzle name entered
- `attempted_code` (text) — exact code entered (or masked, controlled by config)
- `ip_address` (text)
- `user_agent` (text, nullable)
- `created_at` (timestamptz, default now())

RLS: deny all public access (same pattern as other tables — all access via service role in edge functions).

**`ip_blocklist`**
- `id` (uuid, PK, default gen_random_uuid())
- `ip_address` (text, unique)
- `blocked_at` (timestamptz, default now())
- `blocked_by` (uuid, nullable) — profile_id of admin who blocked

RLS: deny all public access.

---

## Step 2: Update `private-login` Edge Function

1. Extract IP from request headers (`x-forwarded-for` or `x-real-ip`) and user-agent.
2. **Before processing credentials**, check if IP is in `ip_blocklist`. If blocked, return 403 with generic error.
3. On **failed login** (bad name, inactive user, wrong password), insert a row into `failed_login_attempts` with exact name, code, IP, and user-agent. Then return the existing 401 deny response.
4. Add a config flag: read a `MASK_FAILED_CODES` secret (optional). If set to `"true"`, store `"****"` instead of the actual code.

---

## Step 3: Add Admin Actions in `messaging` Edge Function

Add three new admin-only actions:

- **`list-failed-logins`** — Returns last 100 failed attempts, each enriched with a `recent_failures` count (failures from the same IP in the last 24h) and a `is_blocked` boolean (whether the IP is in the blocklist).

- **`block-ip`** — Accepts `{ ip_address }`, inserts into `ip_blocklist` with the admin's profile_id.

- **`unblock-ip`** — Accepts `{ ip_address }`, deletes from `ip_blocklist`.

---

## Step 4: Admin UI — "Failed Logins" Page

Create `src/pages/private/AdminFailedLogins.tsx`:

- Uses `PrivateLayout` with title "Failed Login Attempts"
- Fetches data via `invokeMessaging("list-failed-logins", token)`
- Renders a table with columns: Puzzle Name, Puzzle Code, IP Address, Time, Recent Failures (count), Status (Active/Blocked badge)
- Each row has a "Block IP" or "Unblock IP" button
- Handles session expiry like other admin pages
- Polls every 10 seconds

---

## Step 5: Navigation + Routing

- Add route `/p/failed-logins` in `App.tsx` wrapped in `PrivateRoute`
- Add "Failed Logins" entry to `adminNav` in `PrivateSidebar.tsx` (admin-only, using `ShieldAlert` icon)

---

## Step 6: Login Page — IP Block Check

Update `Login.tsx` to call a lightweight check before showing the form. The `private-login` function already blocks at submission time, so this is just a UX improvement: if the IP is blocked, show "Access unavailable" instead of the login form. This will be handled by the existing `private-login` endpoint returning 403 on submission.

No pre-check needed — the block happens server-side at login time. The user simply sees "Access unavailable" after submitting.

---

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | Create `failed_login_attempts` and `ip_blocklist` tables |
| `supabase/functions/private-login/index.ts` | Add IP extraction, blocklist check, failure logging |
| `supabase/functions/messaging/index.ts` | Add `list-failed-logins`, `block-ip`, `unblock-ip` actions |
| `src/pages/private/AdminFailedLogins.tsx` | New admin page with table and block/unblock controls |
| `src/App.tsx` | Add route for failed logins page |
| `src/components/private/PrivateSidebar.tsx` | Add nav entry for admins |

