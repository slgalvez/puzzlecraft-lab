

## Restore admin demo data support on Stats page

**Root cause**: Recent refactors moved all demo data handling out of `PremiumStats.tsx`. Now `getSolveRecords()` always filters out `__demo` records, so admin users with generated demo data see 0 records and hit the early return (rating card + milestones only). The "Generate Stats Demo" / "Clear Demo Data" buttons were also removed from the Stats page entirely.

### Changes

**1. `src/components/account/PremiumStats.tsx`**
- Accept an optional `isAdmin` prop
- When `isAdmin && hasDemoData()`, use `getAllSolveRecordsIncludingDemo()` instead of `getSolveRecords()`, and use `getDemoSolveSummary()` instead of `getSolveSummary()`
- This restores full analytics visibility for admins with demo data active

**2. `src/pages/Stats.tsx`**
- Import `PremiumStatsAdminControls` from the existing admin controls component
- Import `hasDemoData` from `demoStats`
- When user is admin, render `<PremiumStatsAdminControls />` above PremiumStats with a refresh callback that bumps `dataVersion`
- Pass `isAdmin={account?.isAdmin}` to `<PremiumStats />`

### Technical detail

```
Stats.tsx
  └─ if account.isAdmin → render <PremiumStatsAdminControls onRefresh={...} />
  └─ <PremiumStats isAdmin={account?.isAdmin} ratingInfoOverride={ratingInfo} />

PremiumStats.tsx
  └─ records = isAdmin && hasDemoData()
       ? getAllSolveRecordsIncludingDemo()
       : getSolveRecords()
  └─ summary = isAdmin && hasDemoData()
       ? getDemoSolveSummary()
       : getSolveSummary()
```

This restores the admin experience (demo data buttons + full analytics with demo records) without affecting non-admin users.

