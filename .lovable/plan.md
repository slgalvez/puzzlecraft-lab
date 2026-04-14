

# Revised Preview Architecture — No Logic Duplication

## Approach
Extract only the payment-ready UI into `UpgradeModalNextUI.tsx` as a **pure presentational component**. All hooks, state, early returns, and handlers stay in `UpgradeModal.tsx`. The query param flag selects which UI to render for the final payment-ready state only.

## Files

| File | Change |
|------|--------|
| `src/components/account/UpgradeModal.tsx` | Add query param flag; pass props to `UpgradeModalNextUI` for payment-ready state |
| `src/components/account/UpgradeModalNextUI.tsx` | **New** — pure presentational component, no hooks, no logic |

## UpgradeModal.tsx changes

Add at top of file:
```tsx
import UpgradeModalNextUI from "./UpgradeModalNextUI";
```

Add inside component, before existing state:
```tsx
const showNext =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("paywall") === "new";
```

All hooks, state, early returns (pre-launch, stripe-missing, success) remain exactly as-is.

Only the final payment-ready return (lines 206–302) gets wrapped:
```tsx
if (showNext) {
  return (
    <UpgradeModalNextUI
      annual={annual}
      setAnnual={setAnnual}
      purchasing={purchasing}
      result={result}
      errorMessage={errorMessage}
      native={native}
      onPurchase={() => purchase(annual)}
      onRestore={() => restore()}
      onClose={onClose}
    />
  );
}

// existing payment-ready return unchanged below...
```

## UpgradeModalNextUI.tsx — pure presentational

```tsx
interface Props {
  annual: boolean;
  setAnnual: (v: boolean) => void;
  purchasing: boolean;
  result: "idle" | "success" | "cancelled" | "error";
  errorMessage: string | null;
  native: boolean;
  onPurchase: () => void;
  onRestore: () => void;
  onClose: () => void;
}
```

No hooks. No imports of `useSubscription`, `isNativeApp`, or `PUZZLECRAFT_PLUS_LAUNCHED`. Receives everything via props. Contains only JSX for the redesigned paywall:

- **Header**: Crown icon (small `h-10 w-10 rounded-xl bg-primary/8`), "Puzzlecraft+" title, subtitle "Play deeper. Compete smarter. Create without limits."
- **4 benefit sections** as subtle cards with muted icons (no checkmarks):
  - Create & Share (emphasized `border-primary/20`) — "Create & send puzzles to friends", "Add personal messages"
  - Track Progress — "60-day activity history", "Replay past challenges", "Protect your streaks"
  - Unlock Gameplay — "Extreme & Insane modes", "Access weekly puzzle packs"
  - Compete — "Track rank by puzzle type", "Climb global rankings"
- **Pricing**: Two side-by-side cards. Monthly `$2.99 / month`, Annual `$19.99 / year` with `$1.67/mo billed annually` and "Best Value · Save 44%" badge
- **CTA**: Dynamic text via pricing constants — calls `onPurchase`
- **Secondary**: "Continue with free plan" (`onClose`), restore purchases (`onRestore`, native only), error display

## How to test
Append `?paywall=new` to any URL, trigger upgrade modal. Without param, current UI renders unchanged.

