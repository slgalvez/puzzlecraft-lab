

# Restore Detailed Inline Rating Card on Stats Page

## Summary
Replace the generic `ProvisionalRatingCard` on the Stats page (lines 318-327) with the detailed inline rating card matching your screenshots. The Stats page renders identically on iOS and desktop, so this single change covers both.

## What gets restored
- **Rank #X with (i) tooltip** — "YOUR RANK #3" header with info icon explaining rating factors
- **Tier name** in tier color (e.g. "Advanced" in blue)
- **Large rating number** + "rating" label
- **Trending indicator** — up/down arrow comparing current vs `previous_rating` from leaderboard
- **"Based on your recent X solves"** text
- **"Peak: X"** when peak > current rating
- **Next-tier progress bar** with "X pts to [Tier]" and threshold labels
- **"Only X pts until Expert!"** highlight when close (within 12%) to next tier
- **"Play a puzzle now to break through →"** CTA link to `/daily`
- **Leaderboard button** linking to `/leaderboard`

## Changes

**`src/pages/Stats.tsx`** (only file changed)

1. **Lines 318-327**: Replace `<ProvisionalRatingCard ... />` block with the inline rating card that uses the already-computed variables: `localRating`, `ratingInfo`, `myLeaderboardEntry`, `peakRating`, `nextTierInfo`, `tierProgressValue`, `pointsToNext`, `nearRank`

2. **Line 160**: Update `bestRating` in the `localRating` memo to use `peakRating ?? ratingInfo.rating` instead of just `ratingInfo.rating`, so the peak displays correctly

3. The `ProvisionalRatingCard` import can remain (used elsewhere) — it just won't be rendered on this page anymore

## No other files changed
All computation logic (`peakRating`, `nextTierInfo`, `pointsToNext`, `nearRank`) already exists in the current code. This is purely a rendering change.

