

# Fix Premium Upgrade Modal

## Problem
Two issues from previous edits:

1. **`UpgradeModalNextUI.tsx`** (the bottom-sheet shown in screenshot) — benefit sections have barely visible borders (`border-border/20`), icons are tiny (11px), category headers are too small (10px), and `space-y-8` creates excessive gaps making it feel sparse and disconnected.

2. **`src/components/premium/UpgradeModal.tsx`** — this old Dialog-based modal has hardcoded wrong prices (`$4.99`, `$2.99`, `Save 42%`) instead of using the centralized `pricing.ts` constants (`$2.99`/mo, `$19.99`/yr, `Save 44%`). Used by `QuickPlay.tsx` and `Stats.tsx`.

## Changes

### 1. Fix `UpgradeModalNextUI.tsx` — tighten layout and improve visibility

- Reduce outer spacing from `space-y-8` to `space-y-5`
- Benefit section borders: `border-border/20` → `border-border/40` for visibility
- Benefit section padding: `py-2.5` → `py-3`
- Category icons: `size={11}` → `size={13}`
- Category header text: `text-[10px]` → `text-[11px]`
- Benefit item text: `text-[13px]` → `text-sm`

### 2. Fix `src/components/premium/UpgradeModal.tsx` — use centralized pricing

- Import `MONTHLY_PRICE`, `ANNUAL_PRICE`, `ANNUAL_SAVING_PCT`, `ANNUAL_MONTHLY_EQUIV` from `@/lib/pricing`
- Replace all hardcoded `$4.99`, `$2.99`, `Save 42%` with the pricing constants
- Annual card: show `$19.99` with `$1.67/mo billed annually`
- Monthly card: show `$2.99` per month
- CTA button text: use pricing constants instead of hardcoded values

### Files modified
- `src/components/account/UpgradeModalNextUI.tsx`
- `src/components/premium/UpgradeModal.tsx`

