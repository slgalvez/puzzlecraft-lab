## Goal
Add a "Report a Problem" button on the Help page that opens a small dialog, saves the report to a new `bug_reports` table, and pushes a notification to all admin push subscriptions.

## 1. Database — `bug_reports` table (migration)

Columns:
- `id uuid pk default gen_random_uuid()`
- `user_id uuid null` — auth.uid() if signed in
- `user_email text null` — captured server-side from auth or from optional contact field
- `message text not null` (length 10–4000)
- `route text null`
- `user_agent text null`
- `platform text null` (e.g. "web", "pwa", "ios-native")
- `ip_address text null` — set from request headers in edge function
- `status text not null default 'new'` (new | triaged | resolved)
- `created_at timestamptz not null default now()`

RLS:
- Enable RLS.
- `INSERT`: allow `anon` + `authenticated` (the edge function uses service role anyway, but we keep policy permissive enough so direct inserts could work if needed). Actually — since all writes go through the edge function with service role, set INSERT policy to deny for anon/authenticated and let service role bypass. Cleaner: **no client INSERT policy** → all writes via edge function.
- `SELECT`: only `user_is_admin()`.
- No UPDATE/DELETE for clients; admins can update via service-role tools later.

Index: `(created_at desc)`, `(status)`.

## 2. Edge function — `submit-bug-report` (verify_jwt = false)

Responsibilities:
1. Parse + validate body with Zod: `message` (10–4000), optional `contactEmail` (email), `route`, `userAgent`, `platform`.
2. Read `Authorization` header; if a valid Supabase JWT, resolve `user_id` + `email` via service-role admin API.
3. Soft rate limit: count `bug_reports` rows in last 60 min where `ip_address = req-ip` (from `x-forwarded-for`); reject with 429 if `>= 10`. (Per project guidance, the backend lacks proper rate-limit primitives — this is the explicit user-requested ad-hoc check.)
4. Insert row.
5. Fire-and-forget invoke `send-push` (or replicate its logic) targeting all `push_subscriptions` whose `profile_id` belongs to a `user_profiles` row with `is_admin = true`. Payload: `{ title: "New bug report", body: <first 80 chars of message>, url: "/admin-bug-reports" }`. Failures here are swallowed and logged — submission still succeeds.
6. Return `{ ok: true }` on success.

CORS headers per standard pattern.

## 3. Frontend — Help page additions

`src/pages/Help.tsx` is currently a const arrow component. We will:
- Convert to a regular function component (it already kind of is) and add internal state for the dialog open flag.
- Render a "Help & Support" card just under the page heading (or just above the "How to Play" accordion) containing a single shadcn `Button` "Report a problem" with `Bug` icon.
- New component `src/components/help/ReportProblemDialog.tsx` using shadcn `Dialog`:
  - Textarea: "What went wrong?" (required, 10–4000 chars; show char counter at 3500+).
  - Optional input: "Email (optional)" — auto-filled from `useUserAccount` if signed in.
  - Read-only meta line: "Page: <pathname>" (small muted text) + "Device: <short UA>".
  - Submit button "Send report" — disabled while submitting or message <10 chars.
  - On submit: call `supabase.functions.invoke('submit-bug-report', { body })`.
  - On success: replace dialog body with a centered check + "Thanks — your report was sent." and auto-close after 1.8s. Toast `sonner.success`.
  - On error: keep form, show inline rose text "Couldn't send report. Please try again." and re-enable button.

Auto-captured client side and sent in body:
- `route`: `window.location.pathname + window.location.search`
- `userAgent`: `navigator.userAgent` (truncated to 500 chars)
- `platform`: derived — `Capacitor.isNativePlatform?.()` → `"ios-native"`, else `window.matchMedia('(display-mode: standalone)').matches` → `"pwa"`, else `"web"`.

## 4. Admin notification

Reuse the existing `send-push` edge function. The new function fetches admin push subscriptions and calls `send-push` (or directly sends via the same VAPID flow). To avoid duplicating push logic, prefer a server-to-server `fetch` to `${SUPABASE_URL}/functions/v1/send-push` with service-role auth.

Out of scope for this task: building an `/admin-bug-reports` list UI. The push payload links to `/admin-bug-reports` so a future page slot is reserved, but that page is not part of this change.

## 5. Files touched / created

- migration: create `bug_reports` table + RLS.
- new: `supabase/functions/submit-bug-report/index.ts`.
- new: `src/components/help/ReportProblemDialog.tsx`.
- edited: `src/pages/Help.tsx` (add header CTA + dialog mount, ~15 lines).

No changes to existing Help layout beyond adding the CTA + dialog.

## Verification checklist
1. Help page renders new "Report a problem" button.
2. Dialog opens, validates min length, captures route + UA + platform.
3. Signed-in submit stores `user_id` + email; anonymous submit works with optional email.
4. Row appears in `bug_reports`.
5. Admin device with active push subscription receives a notification.
6. Success and failure copy match spec.
7. 11th submission from same IP within an hour returns the failure copy (rate-limit ok).