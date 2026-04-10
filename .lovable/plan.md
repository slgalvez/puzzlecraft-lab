

## Fix iOS Tab Bar and Play Tab — Root Cause & Plan

**Problem**: The app renders the WRONG `IOSTabBar`. `Layout.tsx` imports from `@/components/IOSTabBar` (the old 5-tab version with Daily/Craft/Me labels and wrong icons), not from `@/components/ios/IOSTabBar` (the corrected 4-tab version you already provided).

The Play tab content (`IOSPlayTab`) is correctly imported from `@/components/ios/IOSPlayTab`, but that file still has British spellings ("favourites", "personalised") and the layout order doesn't match your screenshot (Daily Challenge should be the hero at top, Surprise Me below it).

### Changes

**1. `src/components/layout/Layout.tsx`** — Fix the import
- Change `import IOSTabBar from "@/components/IOSTabBar"` → `import IOSTabBar from "@/components/ios/IOSTabBar"`
- This switches from the stale 5-tab version to the corrected 4-tab version (Play/Create/Stats/Account with Dices/Palette/BarChart3/UserCircle icons)

**2. `src/components/ios/IOSPlayTab.tsx`** — Reorder layout + fix spelling
- Move the **Daily Challenge** card above the **Surprise Me** button so Daily is the hero (matches screenshot)
- Fix "Your favourites" → "Your favorites"
- Fix "personalised" → "personalized" in comment
- Keep everything else (Resume card, Weekly Pack, Streak Shield, Rating, puzzle grids, Quick Stats, Customize) in place

**3. Delete stale duplicate files**
- `src/components/IOSTabBar.tsx` — old 5-tab version, no longer needed
- `src/pages/IOSPlayTab.tsx` — old page version with "Hi Charlie", Endless Mode, DailyLeaderboard; not imported anywhere

### Summary
The fix is primarily a wrong-import bug. The correct files already exist in `src/components/ios/` — they just aren't being used by `Layout.tsx`. The layout reorder and spelling fixes are minor edits to the already-correct file.

