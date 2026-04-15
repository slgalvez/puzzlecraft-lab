

# Fix: Stale tier thresholds in ProvisionalRatingCard

## Problem
`ProvisionalRatingCard.tsx` has its own hardcoded `TIER_THRESHOLDS` (line 24-26) with the **old** values:
```ts
{ Beginner: 0, Casual: 400, Skilled: 700, Advanced: 950, Expert: 1200 }
```

These are used by `getNextTierInfo()` to compute "pts to next tier" text and the `rating/threshold` label. With a rating of 1377 and the old Expert threshold of 1200, it shows `-177 pts to Expert` and `1377/1200`.

The actual thresholds in `solveScoring.ts` are `650/850/1300/1650`. The progress bar value (`tierProgress`) comes from `solveScoring.ts` and is correct — but the text labels contradict it.

## Fix
**File:** `src/components/puzzles/ProvisionalRatingCard.tsx`

Update `TIER_THRESHOLDS` on line 24-26 to match the canonical values:
```ts
const TIER_THRESHOLDS: Record<string, number> = {
  Beginner: 0, Casual: 650, Skilled: 850, Advanced: 1300, Expert: 1650,
};
```

One constant updated. Nothing else changes.

## Result
- Rating 1377 with Advanced tier → shows `273 pts to Expert` and `1377/1650`
- Progress bar (already correct from `getTierProgress`) now matches the text

