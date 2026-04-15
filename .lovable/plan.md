

# Rating System Overhaul — Corrected Implementation Plan

## What's being fixed

1. **Tier thresholds recalibrated** — Average medium player (score ~1000) was mapping to Advanced. Now maps to Skilled.
2. **Minimum solve gates** — Prevents 1-solve Expert. Tiers require 3/8/18/30 solves respectively.
3. **Per-type leaderboards** — New table + tabbed UI on Leaderboard page.
4. **Demo data removed** from Leaderboard page.
5. **`getPlayerRatingInfo`** available as unified rating state object.
6. **All rank displays use gated tiers** — single source of truth.

## Files changed (12 total)

| File | Action |
|------|--------|
| **Migration SQL** | New: `type_leaderboard_entries` table, RPCs, tier recalc, display name trigger update |
| `src/lib/solveScoring.ts` | Full replace from upload + add back `getTierCardStyle`, `getTierBadgeStyle` |
| `src/lib/leaderboardSync.ts` | Full replace from upload |
| `src/pages/Leaderboard.tsx` | Full replace from upload |
| `src/components/puzzles/CompletionPanel.tsx` | Pass `solveCount` to `getSkillTier` (line 82) |
| `src/hooks/usePuzzleTimer.ts` | Pass `solveCount` to both `getSkillTier` calls (lines 150, 169) |
| `src/hooks/useRatingSync.ts` | Pass `solveCount` to `getSkillTier` (line 33) |
| `src/lib/milestones.ts` | Pass `solveCount` to both `getSkillTier` calls (lines 148, 193) |
| `src/pages/Account.tsx` | Pass `solveCount` to `getSkillTier` (line 66) |
| `src/components/account/PremiumStats.tsx` | Pass `solveCount` to `getSkillTier` (line 136) |
| `src/components/ios/IOSPlayTab.tsx` | Pass `solveCount` to `getSkillTier` (line 160) |
| `src/lib/demoStats.ts` | Update `tierForRating` thresholds (lines 207-211) |

## Critical compatibility fixes applied

1. **`getTierCardStyle` and `getTierBadgeStyle`** — Missing from uploaded file. Will be added back with identical style maps (imported by `ProvisionalRatingCard`, `TierUpCelebration`, `AdminPreview`, `Stats`).

2. **RLS policy conflict** — The uploaded SQL creates a restrictive `FOR ALL` policy alongside permissive `FOR SELECT`. Restrictive ALL blocks authenticated SELECT. Fix: remove the restrictive ALL policy entirely; writes are protected by SECURITY DEFINER RPC pattern (same as `leaderboard_entries`).

3. **Display name trigger** — `propagate_display_name_change()` must also update `type_leaderboard_entries.display_name`. Added to migration.

4. **`demoStats.ts` thresholds** — `tierForRating()` uses hardcoded old thresholds. Updated to 650/850/1300/1650.

5. **8 ungated `getSkillTier` calls** — All updated to pass `records.length` as second argument.

## Single source of truth

`getSkillTier(rating, solveCount)` is the sole authority for displayed rank. Every user-facing call site passes `solveCount`. DB-stored tiers in `leaderboard_entries` and `type_leaderboard_entries` are snapshots written by SECURITY DEFINER RPCs that also use gated tiers.

