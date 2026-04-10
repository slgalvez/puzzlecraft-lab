

# Replace Stats Tab with Uploaded Version + Preserve Current Features

## Summary
Replace `src/pages/Stats.tsx` with the uploaded `Stats_1-2.tsx` as the base, then layer in the newer features that exist in the current version but are missing from the uploaded file.

## What the uploaded file provides (kept as-is)
- The detailed inline rating card with tooltip, peak, "based on recent X solves", progress bar, "Only X pts until [Tier]!", "Play now to break through"
- The original rating computation with peak via rolling window (lines 73-85)
- Clean layout without the generic `ProvisionalRatingCard`

## What the current version has that the uploaded file is missing (will be merged in)
These features will be added into the uploaded file's structure:

1. **Social tab** — `Tabs`/`TabsList`/`TabsContent` wrapper with Personal + Social tabs, `useFriends` for badge count, `SocialTab` component
2. **Visibility change listener** — `useEffect` that bumps `dataVersion` when the user returns to the tab (real-time stat refresh)
3. **Admin controls** — `PremiumStatsAdminControls` component shown for admin users, with `onRefresh` callback and `key={dataVersion}` on `PremiumStats`
4. **DB fallback for rating** — the `ratingInfo` merge logic that falls back to `leaderboard_entries` when local data is empty (so global rank still shows)
5. **Peak rating sliding window** — the improved `peakRating` memo that slides a 25-record window (more accurate than the uploaded file's simpler loop)
6. **Endless stats without native guard** — current version shows endless stats regardless of native mode
7. **checkMilestones guard** — keep it removed (the current version's comment explains why: MilestoneModalManager handles it, calling here causes duplicate toasts)

## File changed
- `src/pages/Stats.tsx` — full replacement using uploaded file as base, with the 7 features above merged in

## What stays exactly the same
- Rating card layout (tooltip, peak, trending arrows, progress bar, near-rank CTA)
- Key stat cards grid
- Recent solves list with PB badges and speed bars
- Right column (puzzle type breakdown, daily challenge, endless)
- Premium stats section
- Upgrade modal and premium preview teaser
- All imports from solveTracker, solveScoring, leaderboardSync, etc.

