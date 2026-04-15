

# Enhance Recent Solves with Scores and Badge Icons

## Problem
The Recent Solves rows currently show only type name, PB badge, time bar, difficulty, time, and date. The plan called for scores and icons (clean solve, PB, daily flame) but these were dropped during implementation.

## Approach

Match each `CompletionRecord` to its corresponding `SolveRecord` by `puzzleKey`/`completedAt` proximity, then compute score and derive badge indicators.

## Changes — `src/pages/Stats.tsx`

### 1. Build a solve record lookup (inside the Recent Solves render block)

Create a map from solve records keyed by approximate timestamp + type to match completions:

```tsx
const solveRecordMap = useMemo(() => {
  const recs = isViewAs ? getSolveRecordsFrom(viewAsUser!.solves) : getSolveRecords();
  const map = new Map<string, SolveRecord>();
  for (const r of recs) {
    map.set(`${r.puzzleType}-${r.completedAt.slice(0, 16)}`, r);
  }
  return map;
}, [isViewAs, viewAsUser]);
```

### 2. In each row, look up the matching solve record

```tsx
const matchKey = `${c.category}-${c.date.slice(0, 16)}`;
const solveRec = solveRecordMap.get(matchKey);
const score = solveRec ? computeSolveScore(solveRec) : null;
const isClean = solveRec && solveRec.hintsUsed === 0 && solveRec.mistakesCount === 0;
const isDaily = solveRec?.isDailyChallenge;
```

### 3. Add to each row

- **Score**: small mono number next to the time (e.g., `1,240 pts`)
- **Clean solve icon**: `Shield` icon (green tint) when no hints and no mistakes
- **Daily flame icon**: `Flame` icon (orange) when `isDailyChallenge`
- **PB badge**: already exists, keep as-is

Icons rendered as a small inline group between the type name and the time column.

### 4. Import `SolveRecord` type

Add `import type { SolveRecord } from "@/lib/solveTracker"` (already importing `getSolveRecords`).

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Stats.tsx` | Add solve record matching, render score + clean/daily icons in Recent Solves rows |

