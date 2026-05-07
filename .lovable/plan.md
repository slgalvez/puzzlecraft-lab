## Plan

Fix the Stats ranking-card gate so Plus test accounts with fewer than 5 qualifying solves can actually see the temporary ranking card.

### What I found

- The card was added only for `!ratingInfo.hasNoData && ratingInfo.isProvisional`.
- But the rating engine marks users with fewer than 5 qualifying solves as `hasNoData: true` and `isProvisional: false`.
- So the current condition can only show the card for 5–9 solves, not for the “under X puzzles solved” state you’re testing.
- The existing `ProvisionalRatingCard` already has a no-data/early-solves state, but Stats blocks it before it can render.

### Changes to make

1. In `src/pages/Stats.tsx`, replace the provisional-card condition with a Plus-only early-ranking condition:
   - show on the general Stats view
   - require Plus access
   - show while the user is not leaderboard-qualified (`!ratingInfo.onLeaderboard`)
   - allow both `hasNoData` and provisional states

2. Keep the confirmed Player Profile card hidden until leaderboard/rank data is ready:
   - only render it when `ratingInfo.onLeaderboard` is true
   - this prevents stacking or showing the wrong card for under-10-solve users

3. Pass the existing `ratingInfo` into `ProvisionalRatingCard` unchanged:
   - for 0–4 solves it will show the starter/early ranking state
   - for 5–9 solves it will show the provisional rating/progress state
   - for 10+ solves the confirmed Player Profile card takes over

### Technical details

Current failing gate:
```tsx
showGeneral && isPlus && !ratingInfo.hasNoData && ratingInfo.isProvisional
```

Planned gate:
```tsx
showGeneral && isPlus && !ratingInfo.onLeaderboard
```

Confirmed card gate becomes:
```tsx
showGeneral && isPlus && localRating && ratingInfo.onLeaderboard
```

No backend or data-flow changes are needed.