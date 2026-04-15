

# Fix milestone tier thresholds + add new milestones

## Problem
`TIER_RATING_THRESHOLDS` in `milestones.ts` (line 74-78) still uses the old values (700/950/1200) instead of the recalibrated thresholds (850/1300/1650). This causes Expert to show "1200/1200 rating" instead of "1650/1650".

## Changes — single file: `src/lib/milestones.ts`

### 1. Fix thresholds (line 74-78)
```ts
const TIER_RATING_THRESHOLDS: Record<string, number> = {
  Skilled: 850,
  Advanced: 1300,
  Expert: 1650,
};
```

### 2. Add new milestones

**Additional solve milestones** (add to `SOLVE_MILESTONES`):
- 500 Puzzles Solved (icon: crown, "Half a thousand. Legendary.")
- 1000 Puzzles Solved (icon: trophy, "Four digits. You're in a class of your own.")

**Additional streak milestones** (add to `STREAK_MILESTONES`):
- 60-Day Streak (icon: award, "Two months. Unbreakable.")
- 100-Day Streak (icon: crown, "Triple digits. This is mastery.")

**New tier milestone**:
- Casual Rank Reached (id: tier-casual, threshold 650, icon: zap, "You've found your rhythm.")

This adds the "Casual" tier as a reachable milestone (currently skipped), and extends the solve/streak ladders for dedicated players. The `TIER_ORDER` array used in `checkMilestones` and `getAllMilestones` already includes all tiers from `solveScoring.ts`, so tier checking logic works without changes.

### 3. Update `TIER_ORDER` and `TIER_MILESTONES` arrays
Add `"Casual"` to the local `TIER_ORDER` array and add the Casual entry to `TIER_MILESTONES` so it's checked and displayed.

No other files need changes — `getAllMilestones()` and `checkMilestones()` dynamically iterate these arrays.

