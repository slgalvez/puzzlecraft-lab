

# Fix: Premium features showing when signed out

## Root Cause

`hasPremiumAccess()` in `src/lib/premiumAccess.ts` line 33:
```
if (!PUZZLECRAFT_PLUS_LAUNCHED) return true; // pre-launch: everyone gets full access
```

Since `PUZZLECRAFT_PLUS_LAUNCHED = false`, **every user — including signed-out users — gets `isPremium = true`**. This causes:
- Stats page shows the rating hero card, PremiumStats analytics, and hides the "Coming Soon" preview
- Account page shows premium rating card and premium blocks even when signed out
- The "Coming Soon" pull tab never renders because `premiumAccess` is always true

## Fix

**One-line change in `src/lib/premiumAccess.ts`** — the pre-launch bypass should only grant access to **signed-in** users:

```typescript
// Before:
if (!PUZZLECRAFT_PLUS_LAUNCHED) return true;

// After:
if (!PUZZLECRAFT_PLUS_LAUNCHED) return !!account;
```

This means:
- **Signed in** → `hasPremiumAccess` returns `true` (pre-launch: full access as intended)
- **Signed out** → `hasPremiumAccess` returns `false` (no premium UI shown)

The "Coming Soon" pull tab on Account (line 305) already has the condition `!PUZZLECRAFT_PLUS_LAUNCHED && !isAdmin`, and `shouldShowUpgradeCTA` returns `false` pre-launch — so the signed-out Account page will correctly show the "Coming Soon" teaser. The Stats page will show `StatsPremiumPreview` for signed-out users (line 669: `!premiumAccess && !accountLoading`).

No other files need changes — all gating flows through this single function.

