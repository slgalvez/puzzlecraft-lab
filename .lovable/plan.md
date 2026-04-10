

# Final Stabilization Audit — Findings and Plan

## Issues Found

### 1. `require()` in ESM context — `checkFreeShieldEarn()` (BUG)
**File:** `src/hooks/useStreakShield.ts`, line 141
**Problem:** Uses `require("@/lib/solveTracker")` which does not work in Vite's ESM environment. This function silently fails inside the `try/catch`, meaning free users can never earn a streak shield from 7-day streaks.
**Fix:** Replace the `require()` with a static `import` at the top of the file. Import `getSolveRecords` from `@/lib/solveTracker` alongside the existing imports. This creates no circular dependency since `solveTracker` does not import from `useStreakShield`.

### 2. Console ref warnings from `SocialTab` sub-components (WARNING)
**File:** `src/components/social/SocialTab.tsx`, lines 450 and 491
**Problem:** `FriendsRatingLeaderboard` and `FriendsList` are plain function components. Radix Tabs' `Presence` mechanism tries to pass refs down, causing "Function components cannot be given refs" warnings.
**Fix:** Wrap both components with `React.forwardRef`. They don't need to use the ref — just accept and discard it to silence the warning.

### 3. Stale comment in `signUp` (COSMETIC, LOW PRIORITY)
**File:** `src/contexts/UserAccountContext.tsx`, line 259
**Problem:** Comment says "No emailRedirectTo" but the code passes `emailRedirectTo`. This is misleading but not a bug — the code behavior is correct.
**Fix:** Update the comment to match the actual behavior.

## Items Verified as Working (NOT TOUCHED)

- **Puzzle generation**: All 8 puzzle types use seed-based generation with correct difficulty mapping
- **Share links**: `craftShare.ts` correctly uses published URL for preview hosts, falls back to origin
- **Stats/Ranking**: Uses `getSolveRecords()` which filters out `__demo` records; `getPlayerRatingInfo()` handles provisional/confirmed/leaderboard thresholds correctly; NaN guards present
- **Demo data isolation**: `getSolveRecords()` always filters `__demo`, `getDemoSolveRecords()` is admin-only
- **Auth redirects**: Uses `WEB_ORIGIN` (published URL), no lovable.dev references found
- **Daily challenge**: Correct date-based seed, streak calculation, completion recording
- **Endless mode**: Session history correctly filters demo data
- **Premium gating**: Properly checks admin/subscribed status, craft limit per month works
- **Leaderboard sync**: Uses `LEADERBOARD_THRESHOLD` (10 solves) correctly
- **Rating sync**: Restores from DB on fresh install, syncs on mount and after solve
- **Input handling**: All puzzle grids have keyboard, tap, and mobile input support
- **Auto-save**: All puzzle grids use `useAutoSave` with `loadProgress`/`clearProgress`
- **Timer**: Resets on puzzle key change, handles countdown, expiry, and solve states

## Risky Items NOT Touched
- Layout/structure of Stats, Play, or any page
- Tab organization or feature placement
- Navigation or icon changes
- Any UI hierarchy changes

## Summary of Changes
Only 2 functional fixes + 1 cosmetic comment fix. No layout, structure, or feature changes.

