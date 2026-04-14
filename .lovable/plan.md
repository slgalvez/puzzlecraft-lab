

# Premium Gating Audit Fix — All Passes

## Summary

Wire `resolveEntitlement()` into the actual gating path, fix 4 call-site bypasses, and delete orphaned code. The entitlement system is architecturally present but functionally disconnected — every gate currently runs an inline `isAdmin || subscribed` check that ignores `subscription_platform` and `subscription_expires_at`.

## Pass 1 — Wire the architecture (3 files, one atomic unit)

### 1a. `src/contexts/UserAccountContext.tsx`
- Add `subscription_platform` and `subscription_expires_at` to `UserAccount` interface
- Update `fetchProfile()` select to include `subscription_platform, subscription_expires_at`
- Map them into the returned account object

### 1b. `src/lib/premiumAccess.ts`
- Widen `GateAccount` to include `subscription_platform?: string | null` and `subscription_expires_at?: string | null`
- Change `hasPremiumAccess()` to call `resolveEntitlement()`:
  ```ts
  export function hasPremiumAccess(account: GateAccount): boolean {
    if (!PUZZLECRAFT_PLUS_LAUNCHED) return !!account;
    if (!account) return false;
    return resolveEntitlement({
      subscribed: !!account.subscribed,
      subscription_platform: account.subscription_platform ?? null,
      subscription_expires_at: account.subscription_expires_at ?? null,
      is_admin: !!account.isAdmin,
    }).hasPlus;
  }
  ```
- Update `usePremiumAccess()` to pass the new fields into `gateAccount`:
  ```ts
  const gateAccount: GateAccount = account
    ? { isAdmin: account.isAdmin, subscribed,
        subscription_platform: account.subscription_platform,
        subscription_expires_at: account.subscription_expires_at }
    : null;
  ```

All 19 existing consumers of `hasPremiumAccess()` and `usePremiumAccess()` continue working unchanged — `GateAccount` is widened (additive), not narrowed.

## Pass 2 — Fix call-site bypasses (3 files)

### 2a. `src/pages/Leaderboard.tsx` (line 90-92)
Replace manual reconstruction:
```ts
// Before:
const { account, subscribed, checkingSubscription } = useUserAccount();
const isAdmin = account?.isAdmin ?? false;
const premiumAccess = hasPremiumAccess({ subscribed, isAdmin });

// After:
const { isPremium: premiumAccess, loading: checkingSubscription } = usePremiumAccess();
const { account } = useUserAccount();  // keep for display_name etc
```

### 2b. `src/pages/Account.tsx` (lines 101-103, 197)
Replace manual reconstruction with hook, and fix the redundant `(subscribed || isAdmin)` OR check on line 197 to use the computed `premiumAccess` variable:
```ts
// Use usePremiumAccess() for gating
const { isPremium: premiumAccess, showUpgradeCTA: showUpgrade } = usePremiumAccess();
// Keep useUserAccount() for display (entitlementSource, subscriptionEnd, account details)

// Line 197: change from (subscribed || isAdmin) to premiumAccess
```

### 2c. `src/components/ios/WeeklyPackCard.tsx` (line 21)
Pass premium status into pack calculation:
```ts
const pack = useMemo(
  () => getCurrentWeeklyPack(isPremium ? { subscribed: true } : null),
  [isPremium, ready]
);
```

## Pass 3 — Cleanup (2 files)

### 3a. Delete `src/lib/craftLimits.ts`
Orphaned module with wrong limit (5 vs 10), different function signature, different storage source. Not imported anywhere.

### 3b. `src/lib/weeklyPacks.ts` (line 277, 347)
The `getCurrentWeeklyPack` function accepts `{ subscribed?, isAdmin? }` and calls `hasPremiumAccess()` internally. Since `GateAccount` is now widened in Pass 1, this call site continues to work correctly — `subscribed: true` will resolve through `resolveEntitlement()` and return `hasPlus: true`. No change strictly required, but the missing `subscription_platform` means it falls through to the `subscribed = true` path (correct behavior for the caller). Optional: simplify to accept `isPremium: boolean` directly.

## Files changed

| File | Change |
|------|--------|
| `src/contexts/UserAccountContext.tsx` | Add 2 fields to interface + fetchProfile select |
| `src/lib/premiumAccess.ts` | Widen GateAccount, wire hasPremiumAccess → resolveEntitlement, pass new fields in hook |
| `src/pages/Leaderboard.tsx` | Replace manual gating with usePremiumAccess() |
| `src/pages/Account.tsx` | Replace manual gating with usePremiumAccess(), fix line 197 |
| `src/components/ios/WeeklyPackCard.tsx` | Pass isPremium into getCurrentWeeklyPack |
| `src/lib/craftLimits.ts` | DELETE |

## Final entitlement resolution order (after fix)

Every gate in the app flows through `hasPremiumAccess()` → `resolveEntitlement()`:

1. `is_admin = true` → access granted, source = `admin_grant`
2. `subscription_platform = 'admin_grant'` AND `subscribed = true` → access granted, source = `admin_grant` (DB trigger protected)
3. `subscribed = true` AND (no expiry OR expiry in future) → access granted, source = `stripe`
4. Otherwise → no access

