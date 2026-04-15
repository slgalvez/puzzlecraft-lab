

# Add Demo Data Support for Recent Solves + Move Admin Controls

## Problem
1. `generateDemoSolves()` creates records with `__demo: true`, but `getSolveRecords()` and `getCompletions()` filter those out — so the Stats page shows nothing when demo data is generated.
2. The admin controls (`PremiumStatsAdminControls`) sit inline in the left column between the Player Profile card and PremiumStats, breaking layout flow.

## Changes

### 1. Make demo records visible when demo mode is active (`src/pages/Stats.tsx`)

When the admin generates demo data, use `getAllSolveRecordsIncludingDemo()` instead of `getSolveRecords()` for the solve record map, and pass demo-inclusive data through to all memo computations. Add a `demoActive` state that toggles with the admin controls.

Specifically:
- Import `hasDemoData` from `demoStats` and `getAllSolveRecordsIncludingDemo` from `solveTracker`
- When `account?.isAdmin && hasDemoData()`, use demo-inclusive getters for `solveRecordMap`, `stats`, `localRatingInfo`, etc.
- The `progressTracker.getCompletions` also needs demo inclusion — add an `includeDemo` parameter usage or use the existing `getCompletions(true)` path (it already accepts `includeDemo`).

### 2. Move admin controls to a fixed top-right position (`src/pages/Stats.tsx`)

Move the `PremiumStatsAdminControls` out of the left column flow. Place it as a fixed/absolute-positioned toolbar in the top-right corner of the page container (near the heading), styled as a small floating pill. This keeps it accessible but out of the layout flow.

```
┌─────────────────────────────────────────────┐
│  Your Progress              [Admin Tools ▾] │
│  Your solving stats...                      │
├─────────────────────────────────────────────┤
│  Player Profile Card                        │
│  ...                                        │
```

- Move admin controls render from lines 455-457 into the heading area (lines 312-323)
- Style as `absolute top-0 right-0` within a `relative` wrapper on the heading div
- Compact horizontal layout with small buttons

### 3. Include demo completions in progress stats

In `progressTracker.ts`, the `getCompletions()` already accepts `includeDemo` parameter. Export a `getProgressStatsIncludingDemo()` or have Stats.tsx call a different path when demo mode is active.

Simpler approach: In Stats.tsx, when demo is active, override the `stats` memo to use the `includeDemo` flow. Since `getCompletions(true)` is internal, we can either:
- Export it, or
- Have Stats.tsx read completions directly from localStorage when demo is active

Best approach: Export `getProgressStats(includeDemo?: boolean)` from progressTracker.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Stats.tsx` | Move admin controls to heading area; use demo-inclusive data when demo active |
| `src/lib/progressTracker.ts` | Export `getProgressStatsWithDemo()` that includes `__demo` records |
| `src/lib/solveTracker.ts` | Already has `getAllSolveRecordsIncludingDemo()` — no change needed |
| `src/components/account/PremiumStatsAdminControls.tsx` | No change needed |

