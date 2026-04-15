

# Fix PremiumStats to Use View-as Data

## Problem
`PremiumStats` always reads from `localStorage` via `getSolveRecords()` and `getSolveSummary()`. In view-as mode, it shows the admin's own data (or demo data) instead of the selected user's solve records. This causes a duplicate/conflicting rating card.

## Solution
Pass the view-as user's solve records into `PremiumStats` as an optional prop. When provided, use those instead of reading from localStorage.

## Changes

### 1. `src/components/account/PremiumStats.tsx`
- Add optional prop `overrideSolveRecords?: SolveRecord[]`
- When provided, use it instead of `getSolveRecords()` / `getAllSolveRecordsIncludingDemo()`
- Build summary from the override records directly using `buildSummary`-style logic (or inline the same reduce)
- Skip demo data checks (`hasDemoData`, `demoActive`) when override is present

### 2. `src/pages/Stats.tsx` (line ~552)
- When `isViewAs`, pass the view-as user's solves to PremiumStats:
```tsx
<PremiumStats
  key={dataVersion}
  hideAdminControls={isViewAs}
  overrideSolveRecords={isViewAs ? getSolveRecordsFrom(viewAsUser!.solves) : undefined}
/>
```

## Files changed
| File | Change |
|------|--------|
| `src/components/account/PremiumStats.tsx` | Accept `overrideSolveRecords` prop, use it when present |
| `src/pages/Stats.tsx` | Pass view-as solves to PremiumStats |

