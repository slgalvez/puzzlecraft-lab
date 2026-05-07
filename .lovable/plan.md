## Admin: Delete user accounts

### 1. Edge function `admin-delete-user` (new)
- `verify_jwt = false`; validate caller's JWT in code via `getClaims()`.
- Confirm caller is admin: query `user_profiles.is_admin` for `claims.sub`.
- Validate body `{ user_id: uuid }` (Zod), reject if equals caller (no self-delete).
- Use service-role client to:
  1. Delete from `leaderboard_entries`, `type_leaderboard_entries`, `daily_scores` where `user_id = target`.
  2. Delete from `user_progress`, `admin_push_subscriptions`, `friend_requests` (sender or receiver), `friendships` (a or b), `bug_reports` (user_id), `user_profiles`.
  3. Finally `supabase.auth.admin.deleteUser(target)` — cascades any remaining auth rows.
- Return `{ ok: true }` or `{ error }` with CORS headers.

### 2. Admin Analytics UI (`src/pages/AdminAnalytics.tsx`)
- Add a Trash icon button at end of each user row (next to the existing Eye link).
- Click opens a shadcn `AlertDialog` confirming: "Delete <name>? This permanently removes their account, leaderboard entries, and progress."
- On confirm: call `supabase.functions.invoke("admin-delete-user", { body: { user_id } })`, on success remove row from local `users` state + toast "User deleted".
- Disable the button on the caller's own row.

### Out of scope
- No bulk delete, no soft-delete/recovery, no audit log table (server logs sufficient).

### Files
- new: `supabase/functions/admin-delete-user/index.ts`
- edited: `src/pages/AdminAnalytics.tsx`
