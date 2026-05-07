## Bug
Non-admin users see "Viewing demo data — not from real solves" because the banner checks `demoActive` (localStorage flag) without gating on `isAdmin`. Their actual records come from `getSolveRecords()` (no demo), so the banner is misleading.

## Fix (single file: `src/components/account/PremiumStats.tsx`)

1. Tie `demoActive` to admin: `const demoActive = useMemo(() => hasOverride ? false : (isAdmin && hasDemoData()), [refreshKey, hasOverride, isAdmin]);`
2. Add a mount effect calling `cleanupDemoFlagForNonAdmin()` when `!isAdmin` to remove the leaked flag from shared devices (import already exists path; add to imports from `@/lib/demoStats`).

No other changes — banner JSX already keys off `demoActive`, so once gated it disappears for normal users.