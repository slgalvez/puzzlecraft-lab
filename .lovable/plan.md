

# Fix Milestones Not Reflecting Solve Count

## Problem
The milestones grid in PremiumStats shows "0/11" achieved even though the stats show 10 solves. Two bugs cause this:

1. **Data source mismatch**: `getAllMilestones()` is called without arguments (line 296), so it internally fetches records via `getSolveRecords()` — independent of the `records` variable used everywhere else in PremiumStats (line 91). For admin/demo mode this means milestones ignore demo data entirely.

2. **Filter mismatch**: The "Total Solves" display (line 286) shows `records.length` which counts ALL records, but `getAllMilestones` internally filters to `solveTime >= 10`. If some solves are under 10 seconds, the milestone count will be lower than displayed.

## Fix

### `src/components/account/PremiumStats.tsx` — line 296

Pass the component's `records` to `getAllMilestones` so both use the same data source:

```diff
- const milestones = getAllMilestones();
+ const milestones = getAllMilestones(records);
```

This single change ensures:
- Milestones use the same records as the rest of PremiumStats
- Admin demo data is reflected in milestones
- The `solveTime >= 10` filter inside `getAllMilestones` still applies (it filters `overrideRecords` too), keeping milestone thresholds honest

No other files change.

