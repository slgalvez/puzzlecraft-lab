

## Fix milestones not reflecting demo data for admin

**Root cause**: `getAllMilestones()` in `milestones.ts` hardcodes `getSolveRecords()` internally (line 188-189), which always filters out `__demo` records. Even though `PremiumStats` correctly fetches demo-inclusive records for the rest of its analytics, the milestone grid ignores them because `getAllMilestones()` never receives them.

### Changes

**`src/lib/milestones.ts`**
- Add an optional `overrideRecords?: SolveRecord[]` parameter to `getAllMilestones()`
- When provided, use those records instead of calling `getSolveRecords()` internally
- Same change for `checkMilestones()` for consistency

**`src/components/account/PremiumStats.tsx`**
- Pass the already-computed `records` array into `getAllMilestones(records)` so demo records are included when admin mode is active

No other files need changes. The fix is surgical — just threading the existing records through instead of letting `getAllMilestones` re-fetch filtered data.

