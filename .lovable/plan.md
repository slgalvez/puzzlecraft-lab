

# Fix milestones in View-As mode + smarter default tab

Two issues:
1. `<MilestonesSection />` ignores View-As/Preview data and reads admin's local `getSolveRecords()`/`getProgressStats()`/`loadSentItems()` — Queen A's 50+ solves don't show.
2. Default tab doesn't prefer the user's most-recently-achieved milestone.

## Files

- `src/lib/milestones.ts`
- `src/components/stats/MilestonesSection.tsx`
- `src/pages/Stats.tsx`

## Changes

### 1. `milestones.ts` — accept full data override

Replace `snapshot()`'s implicit local reads with an optional `MilestoneDataSource`:

```ts
export interface MilestoneDataSource {
  solves?: SolveRecord[];           // overrides getSolveRecords()
  currentStreak?: number;            // overrides getProgressStats().currentStreak
  sentCount?: number;                // overrides loadSentItems().length
  receivedCompleted?: boolean;       // overrides loadReceivedItems()
  /** When true, suppress flag-based milestones (recipient solve / beat challenge) */
  suppressLocalFlags?: boolean;
}
```

- `snapshot(src?: MilestoneDataSource)` — when `src` provided, use its values; for missing fields default to `0`/`false` (do NOT fall back to localStorage, since that would leak admin data into View-As).
- When `suppressLocalFlags === true`, set `firstRecipientSolve = false` and `beatChallengeTime = false`.
- `getAllMilestones(src?: MilestoneDataSource)` — passes through; skips `backfillIfNeeded` whenever `src` is provided (already does this for the legacy `overrideRecords` case).
- `getMilestonesForTab(tab, src?)` — forwards override.
- Remove the legacy `overrideRecords?: SolveRecord[]` parameter and migrate any callers to the new shape (or keep it as an overload that wraps `{ solves: overrideRecords }`).

### 2. `MilestonesSection.tsx` — accept and forward the override

Add prop:

```ts
export interface MilestonesSectionProps {
  defaultTab?: MilestoneTab;
  compact?: boolean;
  showViewAllLink?: boolean;
  dataSource?: MilestoneDataSource;  // NEW
}
```

- Pass `dataSource` to every `getAllMilestones(...)` and `getMilestonesForTab(...)` call (inside `TabContent`, `computeSmartDefaultTab` lookup, `tabCounts` memo, `hasAnyProgress` memo, `uncelebrated` lookups).
- Add `dataSource` to the `useMemo` dependency arrays so tab counts/tiles re-compute when View-As switches.
- Replace `computeSmartDefaultTab` with a "**most recently achieved → fallback Ranked**" picker:
  1. Find the achieved milestone with the latest unlock — since we don't store unlock timestamps, approximate by **highest tier reached** within ranked, then fall back to whichever tab has the highest `achieved` count.
  2. If nothing is achieved, default to **`ranked`** (per spec — "land on Rank tab").
  3. Keep current "any-progress" fallback only when truly empty (preserves graceful zero state).

### 3. `Stats.tsx` — build the dataSource for view-as / preview / real

Inside the `Stats` component, compute one `milestoneDataSource: MilestoneDataSource | undefined` based on the existing 3-branch isolation:

```ts
const milestoneDataSource = useMemo<MilestoneDataSource | undefined>(() => {
  if (previewActive) return {
    solves: preview.profile.calendar.solves,
    currentStreak: getDailyStreakFrom(preview.profile.calendar.dailyData).current,
    sentCount: preview.profile.calendar.craftDates.length,
    receivedCompleted: false,
    suppressLocalFlags: true,
  };
  if (isViewAs) return {
    solves: getSolveRecordsFrom(viewAsUser!.solves),
    currentStreak: getDailyStreakFrom(viewAsUser!.dailyData).current,
    sentCount: 0,            // craft history not synced to backend
    receivedCompleted: false,
    suppressLocalFlags: true,
  };
  return undefined;          // real user — milestones reads localStorage as today
}, [previewActive, preview, isViewAs, viewAsUser, dataVersion]);
```

Pass `<MilestonesSection compact dataSource={milestoneDataSource} />`.

### 4. `Milestones.tsx` standalone page — no change

Continues to read local data (the page is for the signed-in user only). View-As only ever reaches it through Stats, which is the embed.

## Verification

1. View-As Queen A → Milestones section shows her ranked tier, solve-count milestones, streak milestones based on her cloud-synced data, not the admin's.
2. Crafter/Social tabs in View-As show baseline (0) — accurate, since craft history is local-only.
3. Exiting View-As → milestones immediately revert to admin's own data (re-renders via `dataSource` dep).
4. Stats page default tab: a user with any achieved milestone lands on the tab containing their highest-tier / most-achieved milestone; brand-new user lands on **Ranked**.
5. Preview QA mode still isolated (no localStorage leak, no toasts fired, no backfill marked).

