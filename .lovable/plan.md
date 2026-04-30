
# Puzzlecraft+ Paywall Copy & Context Updates

The original instructions referenced elements that don't exist in `UpgradeModal.tsx` because all paywall UI lives in `UpgradeModalNextUI.tsx`. Per your confirmation, changes are applied there and adapted to the actual structure.

## Files changed

- `src/components/account/UpgradeModalNextUI.tsx`
- `src/components/account/UpgradeModal.tsx`

## CHANGE 1 — Rating/leaderboard copy

In `UpgradeModalNextUI.tsx` `BENEFIT_SECTIONS` → "Compete" group:

- Replace `"Track rank by puzzle type"` → `"Player Rating + leaderboard ranking"`
- Leave `"Climb global rankings"` as-is.

## CHANGE 2 — Star social proof

No "five-star / Loved by puzzle enthusiasts" block exists in either file. Skipped.

## CHANGE 3 — Context prop

In `UpgradeModal.tsx`:

```ts
type UpgradeContext =
  | "difficulty" | "craft-limit" | "stats" | "replay" | "streak-shield" | undefined;

const CONTEXT_HEADERS: Record<NonNullable<UpgradeContext>, string> = {
  "difficulty":    "Extreme and Insane difficulty are Puzzlecraft+ only",
  "craft-limit":   "You've used all 10 free crafts this month",
  "stats":         "Full analytics are a Puzzlecraft+ feature",
  "replay":        "Replaying past daily challenges requires Puzzlecraft+",
  "streak-shield": "Streak Shield is a Puzzlecraft+ feature",
};
```

- Add `context?: UpgradeContext` to `UpgradeModalProps`.
- Destructure `context` in the function signature.
- Pass `contextHeader={context ? CONTEXT_HEADERS[context] : undefined}` to `<UpgradeModalNextUI ... />`.

In `UpgradeModalNextUI.tsx`:

- Add `contextHeader?: string` to props interface.
- Render inside the scrollable content `<div className="px-6 pt-2 pb-6 space-y-5">`, immediately before the Header block:

```tsx
{contextHeader && (
  <p className="text-center text-xs font-medium text-primary/80 mb-1 px-2">
    {contextHeader}
  </p>
)}
```

The existing `UpgradeTrigger` system (drives `headline`/`subline`) is left intact; `context` renders additively above the header.

## CHANGE 4 — Native CTA copy

In `ctaLabel()`: replace `"Subscribe on our website"` → `"Subscribe at puzzlecrft.com →"`.

## CHANGE 5 — Trust/billing language

Per your latest direction, the web copy is `"Cancel anytime from account settings · Secure checkout"` (no "Billed annually", since the user can pick monthly).

Also flagging: `TRIAL_DAYS` in `src/lib/pricing.ts` is `0` and marked `@deprecated`. Using it in the native string would render `"0-day free trial · …"`. I'll drop the trial fragment from the native line so it reads cleanly and stays accurate.

In `UpgradeModalNextUI.tsx`:

1. Replace the existing bottom footer `<p className="text-center text-[10px] ...">` block (currently `"Cancel anytime in Settings → Apple ID."` / `"Secure checkout via Stripe. Cancel anytime."`) by moving a new platform-aware trust line directly under the CTA button:

```tsx
<p className="text-center text-[11px] text-muted-foreground">
  {native
    ? "Cancel anytime · Billed via App Store"
    : "Cancel anytime from account settings · Secure checkout"}
</p>
```

2. Immediately after the primary subscribe `</button>` (before "Continue with free plan"), add native-only secondary line:

```tsx
{native && (
  <p className="text-center text-[11px] text-muted-foreground -mt-1">
    Opens in your browser · Secure checkout
  </p>
)}
```

3. Remove the old bottom footer note (now superseded).

4. No `TRIAL_DAYS` import added (kept clean since the value is 0/deprecated).

## What is NOT changed

- Plan toggle, success state, pre-launch state, "Coming Soon" branch in `UpgradeModal.tsx`.
- Restore Purchases button, "Continue with free plan", drag handle, close button.
- Pricing logic, purchase/restore handlers, error display.
- Existing `TRIGGER_COPY` headline/subline system.

## Deviations from literal instructions (called out)

1. **Target file**: `UpgradeModalNextUI.tsx` for the visual changes; `context` prop threaded through `UpgradeModal.tsx`.
2. **CHANGE 1**: Closest equivalent line replaced (`"Track rank by puzzle type"` → new copy).
3. **CHANGE 2**: Skipped — no Star block exists.
4. **CHANGE 5 (web)**: Updated per your latest message — `"Cancel anytime from account settings · Secure checkout"` (no "Billed annually").
5. **CHANGE 5 (native)**: Trial fragment dropped because `TRIAL_DAYS = 0` (deprecated). Final native copy: `"Cancel anytime · Billed via App Store"`. Tell me if you'd rather restore a trial value in `pricing.ts` instead.
6. Old bottom footer note replaced rather than left in place, to avoid duplicate trust copy.
