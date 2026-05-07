## Plan

1. **Keep Plus-only behavior**
   - The provisional ranking card will remain visible only for Puzzlecraft+ users.

2. **Remove the empty-stats bypass**
   - Update `src/pages/Stats.tsx` so Plus users with zero solves do not immediately return the generic empty stats screen.
   - Instead, render the normal Stats layout so `ProvisionalRatingCard` can show its “Your ranking starts here” state.

3. **Make the card independent of local-only solve count**
   - Keep the current `!ratingInfo.onLeaderboard` condition for Plus users, so the card appears for 0–9 qualifying solves.
   - Leave the confirmed Player Profile card gated by `ratingInfo.onLeaderboard`.

4. **Verify the fix**
   - Re-check the rendered Stats route to confirm the provisional card appears for the current test account, whose leaderboard request returns no entry.