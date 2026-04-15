

# Fix: Restore supporting subtext and puzzle link in Stats player profile card

## Problem
When the tier thresholds were updated in `Stats.tsx`, the "nearRank" condition changed from true to false for the viewed user. This caused the "Play a puzzle now to break through →" link underneath the progress bar to disappear. Additionally, the card is missing the "Based on your recent X solves" subtext that exists in the equivalent ProvisionalRatingCard confirmed layout.

## Root cause
- The puzzle link only renders when `nearRank` is true (within 12% of next tier). With old thresholds, -177 pts triggered the condition; with correct thresholds, 273 pts does not.
- "Based on your recent X solves" was never added to the Stats card, but exists in ProvisionalRatingCard's confirmed state.

## Fix
**File:** `src/pages/Stats.tsx`

**1. Add "Based on your recent X solves" subtext** (after line 422, below the rating number):
```tsx
<p className="text-xs text-muted-foreground mt-1">
  Based on your recent {Math.min(localRating.solveCount, 25)} solves
</p>
```

**2. Always show puzzle link** underneath the progress bar (change line 443-447):
```tsx
{nearRank ? (
  <Link to="/daily" className="text-[10px] text-primary mt-1 font-semibold hover:underline">
    Only {pointsToNext} pts away — play now →
  </Link>
) : (
  <Link to="/puzzles" className="text-[10px] text-primary/70 mt-1 font-medium hover:underline hover:text-primary">
    Keep solving to rank up →
  </Link>
)}
```

Two additions in one file. Nothing else changes.

