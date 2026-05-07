## Goal

Send a Web Push notification to the **main admin** (Supabase-auth account, `user_profiles.is_admin = true`) whenever a new bug report is submitted. Admin opts in from either the Account page or `/admin-bug-reports`.

## Why a new table

The existing `push_subscriptions` table is keyed to `profiles.id` (the private/messaging system, custom-JWT auth). Main admin accounts live in `user_profiles` (Supabase auth) — different ID space. We need a parallel table.

## Database

New migration creates `admin_push_subscriptions`:
- `id`, `user_id` (uuid, references main user), `endpoint` (unique with user_id), `p256dh`, `auth`, `created_at`, `last_push_at`
- RLS: only admins (`user_is_admin()`) can SELECT/INSERT/UPDATE/DELETE their own row. INSERT/UPDATE writes guarded by service-role in the edge function.

## Edge function: `admin-push` (new, `verify_jwt = false`)

Three actions, all require Supabase auth bearer token of an admin:

1. `subscribe` — body: `{ endpoint, p256dh, auth }`. Validates caller is admin via `user_profiles.is_admin`, upserts row.
2. `unsubscribe` — deletes the caller's rows (optionally for one endpoint).
3. `test` — sends a test push to caller's subscriptions.

Reuses the VAPID keypair + RFC 8291 encryption from `send-push/index.ts` (extract shared helpers inline — keep it self-contained, no shared module).

## Edge function update: `submit-bug-report`

After a successful insert, server-to-server fire-and-forget:
- Look up all admin subscriptions: `select endpoint, p256dh, auth, user_id from admin_push_subscriptions inner join user_profiles on user_profiles.id = user_id where is_admin = true`.
- For each, send Web Push with payload:
  ```
  { title: "New bug report", body: <first 80 chars>, url: "/admin-bug-reports", tag: "bug-report" }
  ```
- 410/404 responses prune the row.
- Failures are logged, never block the user response.

## Frontend

**New hook: `useAdminPush.ts`**
- `isSupported` — checks `Notification`, `serviceWorker`, `PushManager`.
- `permission`, `isSubscribed` — derived state.
- `subscribe()` — requests permission, registers SW (reuse existing one), `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC_KEY })`, posts to `admin-push?action=subscribe`.
- `unsubscribe()` — unsubscribes locally + posts to `admin-push?action=unsubscribe`.
- `sendTest()` — calls `admin-push?action=test`.

VAPID public key constant lives in the hook (same key used by `send-push`).

**Account page (`src/pages/Account.tsx`)**
- Add admin-only section "Admin notifications" (rendered only when `account.isAdmin`):
  - Toggle "Bug report alerts"
  - "Send test notification" button
  - One-line explainer + permission status.

**Admin Bug Reports page (`src/pages/AdminBugReports.tsx`)**
- Header banner above the list, only when `isSupported && !isSubscribed`:
  - "Get push alerts for new bug reports" + Enable button.
- Hides once subscribed.

## Service worker

Confirm the existing service worker (used by private push) handles `push` events generically — payload's `url` drives navigation on click. If yes, reuse. If it's scoped to private routes only, extend the click handler to allow any in-origin path.

## Files

- New migration: create `admin_push_subscriptions` + RLS
- New: `supabase/functions/admin-push/index.ts`
- Edit: `supabase/functions/submit-bug-report/index.ts` — broadcast to admins
- New: `src/hooks/useAdminPush.ts`
- Edit: `src/pages/Account.tsx` — admin notifications card
- Edit: `src/pages/AdminBugReports.tsx` — enable banner
- Edit (if needed): existing service worker to handle generic push payload

## Verification

1. Admin visits Account → enables "Bug report alerts" → grants browser permission.
2. "Send test" delivers a notification.
3. Anyone (signed-in or anon) submits a bug report from /help → admin receives push within seconds.
4. Tapping push opens `/admin-bug-reports`.
5. Non-admins see no UI; non-admin tokens are rejected by the edge function.
6. Unsubscribe removes rows and stops alerts.
