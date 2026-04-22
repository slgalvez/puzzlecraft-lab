

# Refresh admin preview pages — remove stale, add current

Audit of `/admin-preview`, `/admin-preview/homepage`, `/admin-analytics`, `/admin-view-as-stats`, `/craft-v2` against current production. Goals: drop dead sections, refresh inaccurate ones, add previews for features shipped since the last update.

## What's outdated (remove or rewrite)

**`src/pages/AdminPreview.tsx`**
- **Core UI → "Activity Calendar" stub** (lines 2038–2046): just a paragraph saying "calendar is now inline in Stats." Dead text — delete.
- **Core UI → "Data Controls"** (lines 2048–2091): "Generate 50 Demo Solves" / "Reset Milestones" — overlap with QA Mode panel and dump fake data into real localStorage. Move "Reset Milestones" into QA panel; delete demo-solve buttons (QA Mode preview is the modern path).
- **iOS App → "iOS Tab Bar" mock** (2277–2313): hand-coded emoji tabs — no longer represents `IOSTabBar.tsx` (4 tabs with spring animations + real PuzzleIcon). Replace with real `<IOSTabBar />` rendered in a phone frame OR remove and link to native preview.
- **iOS App → "Friend Activity Feed" mock** (2315–2341): emoji rows. Real component is `FriendActivityFeed.tsx`. Replace with real component fed by QA fixtures.
- **iOS App → "Puzzle Type Picker" mock** (2343–2381): static rows. Real component is `PuzzleTypePicker.tsx` / `IOSCustomizeSheet.tsx`. Swap to render real component.
- **Notifications → "Notification Settings" mock** (2445–2474): hand-built toggle rows with no source of truth. Either render the actual settings UI or delete (currently misleading).
- **Notifications → "Paywall Timing Triggers"** (2476–2500): lists `streak_7`, `friend_solved`, `hard_complete`, `3rd solve in session`. Production triggers in `usePaywallTiming.ts` are `streak_7 | friend_solved | hard_complete | first_milestone | streak_at_risk` — "3rd solve" is gone, `first_milestone` and `streak_at_risk` are missing. Update list to match source.
- **Premium → "Login Premium Preview"** (2166–2173): `LoginPremiumPreview` is no longer surfaced on the live login flow (private login uses code form). Verify and remove if dead.
- **Header copy** (1773–1776): generic — refresh to mention 4 admin tools.

**`src/pages/AdminHomepagePreview.tsx`**
- Mock data is a snapshot of an older homepage. Missing: `WeeklyPackSection` (live on Index for returning users), `StreakShieldBanner` (live), `Puzzlecraft+ section` (Index Section 4 when launched + non-premium), midnight countdown timer, `MONTHLY_PRICE` / `PUZZLECRAFT_PLUS_LAUNCHED` gating.
- Hero CTAs say "Surprise Me / Endless" — current Index is `Surprise / Endless` plus weekly-pack discovery. Update the mock to mirror current 4-section layout.
- "8h 42m left" is hardcoded — replace with mock countdown matching the real timer pattern.

**`src/pages/CraftPreviewPage.tsx` (`/craft-v2`)**
- This is the **current production craft page** mounted at `/craft-v2` as a preview alias. The route doc-comment still says "v2 preview." Decision: keep the route as an alias but add a `<PreviewLabel>` banner clarifying "this is the live craft experience" so it doesn't read as a stale preview.

**`src/pages/AdminAnalytics.tsx`** — current and accurate. No changes.

**`src/pages/AdminViewAsStats.tsx`** — current and accurate. No changes.

## What's missing (add)

Add a **new "Modern Features" tab** to `AdminPreview.tsx` covering shipped-but-unrepresented surfaces:

1. **Streak Shield (live component)** — render `<StreakShieldBanner />` with mock props for all 4 states (at-risk pre-launch, at-risk post-launch, ready, just-used) using the actual component, not hand-coded mocks.
2. **Insights Banner** — render `<InsightsBanner />` with mock `usePersonalInsights` data (trend up / down / neutral / hidden <5 solves).
3. **Weekly Pack Card** — already in iOS tab; also show desktop variant via `<WeeklyPackSection compact />` and `<WeeklyPackSection />` (full-bleed).
4. **Puzzlecraft+ marketing section** — extract Section 4 of `Index.tsx` into a preview block so admins can verify the launched-state CTA without flipping the global flag.
5. **Activity Calendar (real)** — render the real `InlineCalendar` from `Stats.tsx` with QA fixture data (Free 7-day row + Plus monthly grid).
6. **Friend Leaderboard (real)** — render actual `<DailyLeaderboard />` with `hasCompletedToday` toggle (already in iOS tab — promote to a top-level "leaderboards" section alongside `<Leaderboard />` peek).
7. **Tier-up Celebration + Provisional Rating Card** — already in Ranking tab; verify they reflect current `solveScoring.ts` thresholds (`650/850/1300/1650` per memory).
8. **Completion Sheet (iOS-style)** — already in QA Simulators; ensure it renders with current `CompletionSheet.tsx` props.

## File-by-file changes

| File | Change |
|---|---|
| `src/pages/AdminPreview.tsx` | Delete dead sections (calendar stub, demo-data buttons, iOS tab mock, friend feed mock, puzzle picker mock, notif settings mock). Rewrite paywall trigger list to match `usePaywallTiming.ts`. Replace hand-coded mocks with real components fed by `previewFixtures.ts`. Add new "Modern Features" tab. Refresh header copy. |
| `src/pages/AdminHomepagePreview.tsx` | Add mock `WeeklyPackSection`, `StreakShieldBanner`, Puzzlecraft+ marketing section, midnight countdown, `MONTHLY_PRICE` reference. Update mock CTAs to mirror current Index. |
| `src/pages/CraftPreviewPage.tsx` | Add `<PreviewLabel alwaysShow label="Live craft experience" />` banner at top so admins know this is the production page, not a preview. Update route comment in `App.tsx`. |
| `src/components/admin/QAModePanel.tsx` | Add "Reset Milestones / Clear demo solves" buttons (migrated from old Data Controls). |
| `src/App.tsx` | Update inline comment on `/craft-v2` route. |

## Untouched
- `AdminAnalytics.tsx`, `AdminViewAsStats.tsx`, `AdminPremiumEmails.tsx`
- All QA simulators and share-preview infrastructure (`QASimulators`, `QASharePreviews`, `QAMessagingPreview`, `previewFixtures.ts`)
- Production homepage, Stats page, craft flow

## Verification
1. `/admin-preview` Core UI tab: no "calendar is now inline" stub; no demo-data dump buttons.
2. `/admin-preview` iOS tab: real `IOSTabBar`, real `FriendActivityFeed`, real `PuzzleTypePicker` instead of mocks.
3. `/admin-preview` Notifications tab: paywall trigger list matches `usePaywallTiming.ts` exactly (5 triggers).
4. `/admin-preview` new "Modern Features" tab: Streak Shield (4 states), Insights Banner, Weekly Pack (compact + full), Puzzlecraft+ section, real Activity Calendar.
5. `/admin-preview/homepage`: mock now includes Weekly Pack, Streak Shield, and Puzzlecraft+ section matching production Index.
6. `/craft-v2`: shows "Live craft experience" badge at top.
7. `/admin-analytics`, `/admin-view-as-stats`: unchanged and functional.

