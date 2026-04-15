

# View as User (Stats) — Admin Feature

## Overview
Allow admins to view the Stats page as any user by fetching their data from the database and injecting it via React context — no localStorage swapping.

## Architecture

### 1. Database: Admin RPC for reading user progress
Create a `SECURITY DEFINER` function `admin_get_user_progress(p_user_id uuid)` that returns the `user_progress` row. Gated on `user_is_admin()` — returns null for non-admins.

```sql
CREATE OR REPLACE FUNCTION public.admin_get_user_progress(p_user_id uuid)
RETURNS TABLE(completions jsonb, solves jsonb, daily_data jsonb, endless_data jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT completions, solves, daily_data, endless_data
  FROM public.user_progress
  WHERE user_id = p_user_id
    AND (SELECT is_admin FROM public.user_profiles WHERE id = auth.uid()) = true
$$;
```

### 2. New context: `src/contexts/ViewAsUserContext.tsx`
- Stores `viewAsUser: { id, displayName, completions, solves, dailyData, endlessData } | null`
- Provides `enterViewAs(userId)` — calls the RPC, fetches leaderboard entry
- Provides `exitViewAs()` — clears state
- Wraps children and renders a sticky banner when active

### 3. Data override layer: `src/lib/viewAsOverrides.ts`
Pure functions that mirror the localStorage-based helpers but accept data arrays:
- `getProgressStatsFrom(completions)` — same logic as `progressTracker.getProgressStats()` but from provided data
- `getSolveRecordsFrom(solves)` — returns solves array directly
- `getDailyStreakFrom(dailyData)` — computes streak from provided daily completions map
- `getEndlessStatsFrom(endlessData)` — computes endless summary from provided sessions
- `getDailyCompletionFrom(dailyData, dateStr)` — single day lookup

These are thin wrappers reusing the same math as the originals.

### 4. Update `src/pages/Stats.tsx`
- Accept optional `viewAsMode` prop (default false)
- Import `useViewAsUser` context
- When `viewAsUser` is present:
  - Use override functions instead of localStorage helpers for `stats`, `dailyStreak`, `dailyCompleted`, `endlessStats`, `solveRecords`
  - Skip `syncLeaderboardRating` effect
  - Skip `useQuery` for leaderboard (use data from context instead)
  - Hide upgrade CTAs
  - Fetch leaderboard entry for the target user directly

### 5. Update `src/components/stats/ActivityCalendar.tsx`
- Accept optional override props: `overridePlayedDates`, `overrideCraftedDates`, `overrideDailyFn`
- When overrides present, use them instead of `getProgressStats()`, `loadSentItems()`, `getDailyCompletion()`
- Stats.tsx passes these from context data when in view-as mode

### 6. New page: `src/pages/AdminViewAsStats.tsx`
- Route: `/admin-view-as-stats`
- Admin-gated (redirects non-admins)
- Top: search input querying `user_profiles` for display_name/id
- User list with "View Stats" button per row
- On select: calls `enterViewAs(userId)`, renders `<Stats viewAsMode />`
- Sticky banner: "Viewing as [User Name]" with Exit button
- Exit: calls `exitViewAs()`, returns to user selector

### 7. Route in `src/App.tsx`
Add `<Route path="/admin-view-as-stats" element={<AdminViewAsStats />} />` in PublicRoutes.

### 8. Link from `AdminAnalytics.tsx`
Add a small icon button per user row linking to `/admin-view-as-stats?userId={id}`.

## Files changed

| File | Change |
|------|--------|
| Migration | `admin_get_user_progress` RPC |
| `src/contexts/ViewAsUserContext.tsx` | New — context with enter/exit, banner |
| `src/lib/viewAsOverrides.ts` | New — pure data-driven stat functions |
| `src/pages/AdminViewAsStats.tsx` | New — admin page with user selector |
| `src/pages/Stats.tsx` | Add `viewAsMode` prop, context-based data branching |
| `src/components/stats/ActivityCalendar.tsx` | Accept optional override props |
| `src/App.tsx` | Add route |
| `src/pages/AdminAnalytics.tsx` | Add "View Stats" link per row |

## Safety
- No localStorage reads or writes in view-as mode
- No sync, no mutations, no upgrade CTAs
- RPC is `SECURITY DEFINER` gated on `is_admin`
- All data flows through React context — fully reversible by unmounting

