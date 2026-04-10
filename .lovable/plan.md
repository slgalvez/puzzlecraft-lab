

# Restore Detailed Inline Rating Card on Stats Page

## What was lost

The current Stats page delegates the rating card entirely to `ProvisionalRatingCard` (lines 318-327), which is a generic component missing several details visible in your screenshots:

1. **`(i)` tooltip after the rank `#X`** — explaining rating factors (difficulty, speed, accuracy, hints)
2. **"Based on your recent X solves"** text below the rating number
3. **"Peak: X"** display showing all-time best rating
4. **"Only X pts until Expert!"** motivational text when close to next tier
5. **"Play a puzzle now to break through →"** CTA link
6. **Trending up/down arrow** showing rating change vs previous rating from leaderboard data

## What will change

**File: `src/pages/Stats.tsx`** (only file modified)

### 1. Replace ProvisionalRatingCard block with inline rating card
Lines 318-327 will be replaced with the historical inline card that renders:
- `YOUR RANK` header with `#X` rank + `(i)` tooltip
- Tier name in tier color
- Large rating number + "rating" label
- Trending indicator (up/down arrow comparing current vs `myLeaderboardEntry.previous_rating`)
- "Based on your recent X solves" + "Peak: X" when peak > current
- Next-tier progress bar with pts remaining
- "Only X pts until [Tier]!" highlight when within 12% of next threshold
- "Play a puzzle now to break through →" link to `/daily`
- Leaderboard button linking to `/leaderboard`

### 2. Restore `localRating.bestRating` to use actual peak
Update the `localRating` memo (lines 154-162) so `bestRating` uses the computed `peakRating` value instead of just echoing `ratingInfo.rating`.

### 3. No other files changed
All other recent project changes remain intact. The `ProvisionalRatingCard` component file is untouched (it's still used elsewhere like IOSPlayTab).

## Summary of UI restored
- Rank # with info tooltip
- Peak rating display
- "Based on your recent X solves"
- "Only X pts until [Tier]!" + "Play now to break through"
- Trending up/down indicator
- Next-tier progress bar with threshold labels

