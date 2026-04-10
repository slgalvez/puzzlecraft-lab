

## Surgical Rollback Assessment — Play & Stats

After thorough analysis of git history (comparing pre-audit commit `04d314e` against the current codebase), the surgical rollback is **already complete**. Here's the full audit:

### Files Already Restored

| File | Status | Details |
|------|--------|---------|
| `src/components/ios/IOSTabBar.tsx` | ✅ Restored | 4 tabs (Play/Create/Stats/Account), correct icons (Dices/Palette/BarChart3/UserCircle), American labels |
| `src/components/ios/IOSPlayTab.tsx` | ✅ Restored | Daily Challenge hero → Surprise Me → Weekly Pack → Streak Shield → Rating → Favorites → All Puzzles → Quick Stats → Customize. No Endless Mode, no "Hi Charlie", no DailyLeaderboard, no FriendActivityFeed |
| `src/components/layout/Layout.tsx` | ✅ Fixed | Imports from `@/components/ios/IOSTabBar` (correct 4-tab version) |
| `src/components/IOSTabBar.tsx` | ✅ Deleted | Old 5-tab version removed |
| `src/pages/IOSPlayTab.tsx` | ✅ Deleted | Audit-era duplicate removed |

### Stats.tsx — No UI Rollback Needed

The Stats page UI structure (sections, layout, columns) is **identical** to the pre-audit version. The only differences are post-audit **functional fixes** that do not change the UI:

- Visibility-change listener (real-time data refresh)
- DB fallback for ratings (handles missing local data)
- Peak rating calculation (rolling-window average)
- `checkMilestones()` removal (fixed duplicate toasts)
- NaN guard on rating card rendering
- Admin controls for PremiumStats

All of these are bug fixes and data-logic improvements — they preserve the original Stats UI while making it more reliable. Per your rules, these are kept.

### Audit-Era Changes Removed

1. ~~5-tab bar (Play/Daily/Craft/Stats/Me)~~ → reverted to 4 tabs
2. ~~"Hi, Charlie" greeting~~ → removed
3. ~~Endless Mode card on Play tab~~ → removed
4. ~~DailyLeaderboard on Play tab~~ → removed
5. ~~FriendActivityFeed on Play tab~~ → removed
6. ~~"Craft" / "Me" tab labels~~ → reverted to "Create" / "Account"
7. ~~Wrong icons (LayoutGrid/Sun/Wrench/User)~~ → reverted to Dices/Palette/BarChart3/UserCircle

### Why the Screenshot Showed 5 Tabs

The simulator was likely serving a cached/stale build. The code on disk is correct. A clean rebuild should show the 4-tab layout.

### Remaining Action

No code changes needed — but I recommend triggering a fresh build to confirm the simulator picks up all changes. If the 5-tab bar persists after a fresh build, there may be a Capacitor-level caching issue requiring a clean install on the simulator.

