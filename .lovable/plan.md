

## Problem

When a user has no rating data, "Your ranking starts here" appears twice on the Stats page:
1. From the `ProvisionalRatingCard` in Stats.tsx (line 270)
2. From the `ProvisionalRatingCard` inside `PremiumStats` (line 172, rendered at line 383)

Both render the same `NoDataState` card, making it redundant.

## Fix

**Skip the hero `ProvisionalRatingCard` in Stats.tsx when there's no data**, since `PremiumStats` already handles that state. The layout stays intact — the card simply won't render when there's nothing to show, and `PremiumStats` below will still show its version along with the milestones scaffold.

### Change

**`src/pages/Stats.tsx`** (~line 268): Add `!ratingInfo.hasNoData` to the existing condition:

```tsx
// Before
{showGeneral && premiumAccess && (

// After
{showGeneral && premiumAccess && !ratingInfo.hasNoData && (
```

This keeps the full rating card visible once the user has any solves (provisional or confirmed), but removes the duplicate empty-state prompt.

