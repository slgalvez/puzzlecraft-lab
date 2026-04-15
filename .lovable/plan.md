

# Hide Admin Demo Controls in View-as Mode

## Problem
When viewing stats as another user, the admin demo data controls ("Generate Stats Demo", "Clear Demo Data") and the demo data warning banner still appear. This should show exactly what the user sees — no admin tooling.

## Change

### `src/pages/Stats.tsx` (line 549)
Change the admin controls guard from:
```tsx
{account?.isAdmin && (
  <PremiumStatsAdminControls ... />
)}
```
to:
```tsx
{account?.isAdmin && !isViewAs && (
  <PremiumStatsAdminControls ... />
)}
```

This single condition addition hides the demo data generation/clearing controls when in view-as mode, so the Stats page renders exactly as the target user would see it.

## Files changed
| File | Change |
|------|--------|
| `src/pages/Stats.tsx` | Add `!isViewAs` guard to `PremiumStatsAdminControls` render |

