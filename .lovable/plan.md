## Goal
Allow admin to clear failed login attempts in `/p/failed-logins` — both individually (per row) and all at once.

## Backend (`supabase/functions/messaging/index.ts`)
Add two new admin-gated actions next to the existing failed-login handlers:

- `clear-failed-login` — body `{ id: string }`. Admin-only. Deletes one row from `failed_login_attempts` by id.
- `clear-all-failed-logins` — admin-only. Deletes all rows from `failed_login_attempts`.

Both return `{ ok: true }` and use the same `isAdmin` guard pattern already used by `list-failed-logins` / `block-ip`.

## Frontend (`src/pages/private/AdminFailedLogins.tsx`)
- Add a "Clear all" button in the header row (next to the polling status text), with an AlertDialog confirmation. On confirm, call `clear-all-failed-logins` and refresh.
- Add a small trash/X icon button per row in the Action column (alongside the existing Block/Unblock button). On click, call `clear-failed-login` with the row id and refresh. No confirm for individual clears (low-stakes, easy to redo).
- Toasts on success/error; reuse `SessionExpiredError` handling already in the file.

## Out of scope
- No schema changes (table already exists, no RLS exposure since access is via edge function with service role).
- No changes to IP blocklist behavior — clearing an attempt does not unblock the IP.
