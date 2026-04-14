

# Three-Batch Low-Risk Feature Implementation

## Batch 1 — CompletionPanel Improvements (4 features)

### 1a. New file: `src/lib/appRating.ts`
Create a new module that dynamically imports `@capacitor-community/in-app-review` with silent fallback. Exports `maybeRequestRating({ solveCount, isNewBest, streakLength })` — checks conditions (5+ solves, PB or streak milestone, 90-day cooldown via localStorage key), then calls `InAppReview.requestReview()`. Silent no-op on web or if plugin missing.

### 1b. Patch: `src/lib/haptic.ts`
Add two new exported functions at the end of the file (no existing code changed):
- `hapticPB()` — double-pulse pattern `[15, 80, 15]` for personal bests
- `hapticHardComplete()` — heavier pattern `[20, 50, 20, 50, 20]` for hard+ completions

### 1c. Patch: `src/components/puzzles/CompletionPanel.tsx`
Four additive changes within the existing component:

1. **PB share auto-expand**: Add `shareOpen` state, auto-set to `true` when `isNewBest` is detected in the useEffect. Wrap the share URL/code block (lines 383-395) in a conditional on `shareOpen || !isNewBest` so it auto-shows for PBs. Add `buildShareData` optional `prevBest` param for richer share text ("Beat my previous time of X!").

2. **Daily rank display**: Import `useQuery` from `@tanstack/react-query` and `supabase` client. After the streak block (line 336), add a conditional block: if `isDaily && dailyCode`, query `daily_scores` filtered by `.eq("date_str", dailyCode)` ordered by `solve_time asc`. Compute rank by finding user's position. Display "You ranked #X of Y players today" in a small pill.

3. **App rating prompt**: Import `maybeRequestRating` from `@/lib/appRating`. Add a single call in the existing `useEffect` (line 149): `maybeRequestRating({ solveCount: records.length, isNewBest, streakLength: streak.current })`. Fire-and-forget, no state changes.

4. **Improved haptics**: Import `hapticPB` and `hapticHardComplete`. In the useEffect (line 150), replace the single `hapticSuccess()` with conditional logic: if `isNewBest` → `hapticPB()`, else if difficulty is `hard`/`extreme`/`insane` → `hapticHardComplete()`, else → `hapticSuccess()`.

---

## Batch 2 — Safe UI Improvements (2 features)

### 2a. Replace: `src/components/ios/StreakShieldBanner.tsx`
Same props interface (`streakLength`, `hasPlayedToday`), same hooks consumed. Changes:
- **State B** (has shield): upgrade from plain text to a styled pill with `rounded-full border` and conditional amber tint when `streakLength > 7` (high-stake visual).
- **State C** (no shield, at risk): upgrade border to `border-amber-500/30`, add concrete loss messaging ("Your {N}-day streak expires tonight"), and amber Shield icon coloring.
- State A unchanged.
- Remove unused `Sparkles` import if present.

### 2b. Patch: `src/components/onboarding/OnboardingFlow.tsx`
Single-line change on line 148: replace `crossword` with `word-search` in the navigate URL. Update the last-screen text (line 243) from "easy crossword" to "easy word search". No notification logic added.

---

## Batch 3 — Weekly Pack Expiry Countdown

### 3a. Patch: `src/components/ios/WeeklyPackCard.tsx`
Additive changes only — no removal of DB fetch logic, no structural changes:

1. Add a `daysRemaining` computation after `progressPct` (line 23): calculate days between `now` and `pack.releaseDate + 7 days` (next Sunday = pack expiry). Clamp to 0.

2. In the unlocked footer section (lines 98-109), after the progress bar, add a small expiry label: "Ends in {N} days". Apply conditional styling:
   - `>= 3 days`: muted text (default)
   - `< 3 days`: amber text + amber dot
   - `< 1 day`: red text ("Ends today")

No other changes to pack loading, DB fetch, override logic, or component structure.

---

## Files Changed (exhaustive list)

| File | Action | Batch |
|------|--------|-------|
| `src/lib/appRating.ts` | CREATE | 1 |
| `src/lib/haptic.ts` | ADD 2 functions | 1 |
| `src/components/puzzles/CompletionPanel.tsx` | PATCH (4 additions) | 1 |
| `src/components/ios/StreakShieldBanner.tsx` | REPLACE (same API) | 2 |
| `src/components/onboarding/OnboardingFlow.tsx` | 2-line change | 2 |
| `src/components/ios/WeeklyPackCard.tsx` | PATCH (add expiry UI) | 3 |

## What is NOT changed
- No IOSPlayTab modifications
- No push notification changes
- No entitlement/navigation/routing changes
- No new dependencies required (appRating uses dynamic import with silent fallback)
- No existing features removed or altered
- DB fetch logic in WeeklyPackCard preserved

