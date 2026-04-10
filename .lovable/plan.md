

## Problem

The admin analytics page shows stale/empty data because:

1. **No email column** on `user_profiles` — the code queries `select("id, email")` but `email` doesn't exist on that table, so every user shows as `user-XXXXXX`.
2. **RLS blocks cross-user reads** on `user_progress` — the policy restricts to `auth.uid() = user_id`, so an admin sees 0 rows for other users. Solve counts and last-active are always 0/null.
3. **Existing synced columns ignored** — `user_profiles` already has `solves_count`, `rating`, `rating_tier`, and `updated_at` which are synced by the rating-sync system. The page should use these instead of trying to read `user_progress`.

## Fix

**Single file change: `src/pages/AdminAnalytics.tsx`**

Remove the `user_progress` query and the fake email query entirely. Instead, use data already on `user_profiles`:

- **Email**: Use `auth.users` email via an edge function, OR simply show display name only and drop the email column (admin can look up emails in Lovable Cloud). Since emails aren't stored in `user_profiles`, the cleanest client-side fix is to remove the email field from the table and show display names.
- **Solve count**: Use `user_profiles.solves_count` (already synced by rating-sync).
- **Last active**: Use `user_profiles.updated_at` (updated on every sync).
- **Rating/tier**: Use `user_profiles.rating` and `user_profiles.rating_tier`.
- **Subscribed**: Use `user_profiles.is_premium` (already used).

### Revised query

```typescript
const { data: profiles } = await supabase
  .from("user_profiles")
  .select("id, display_name, is_premium, created_at, updated_at, solves_count, rating, rating_tier, subscribed")
  .order("created_at", { ascending: false })
  .limit(500);
```

### Revised UserRow

```typescript
interface UserRow {
  id: string;
  displayName: string | null;
  createdAt: string;
  solveCount: number;
  lastActive: string | null;
  isSubscribed: boolean;
  rating: number;
  ratingTier: string;
}
```

### UI updates
- Remove "Email" from the table — replace with just display name (since email isn't available client-side).
- Add a "Rating" or "Tier" column to replace it — more useful for admin analytics.
- Update the CSV export to match.
- Update search to filter by display name only.
- Remove all `user_progress` and fake email query code.

### RLS note
The `up_search` policy on `user_profiles` already allows public SELECT (`USING (true)`), so admins can read all profiles. No migration needed.

