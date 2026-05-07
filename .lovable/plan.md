## Goal
Show the provisional ranking card on `/stats` for Plus users with fewer than 5 solves, so they see "X more solves to confirm your rank" and progress pips instead of a blank/empty Player Profile area.

## Root cause
`Stats.tsx` imports `ProvisionalRatingCard` but never renders it. The custom "Player Profile" card (lines 946–1026) shows for Plus users regardless of provisional state, with no provisional messaging.

## Change (single file: `src/pages/Stats.tsx`)

In the LEFT COLUMN, just above the existing "UNIFIED PLAYER PROFILE CARD" block (line 945):

1. Render `<ProvisionalRatingCard info={ratingInfo} peakRating={peakRating} leaderboardRank={myLeaderboardEntry?.rank ?? null} />` when:
   - `showGeneral && isPlus`
   - `!ratingInfo.hasNoData`
   - `ratingInfo.isProvisional` is true

2. Update the existing custom Player Profile card condition to additionally require `!ratingInfo.isProvisional`, so the two never stack.

Plus-only gating matches the existing Player Profile card. No data-flow changes needed.
