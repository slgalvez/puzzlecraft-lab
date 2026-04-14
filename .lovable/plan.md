

# Unified Entitlement System — Implementation Plan

## Summary
Add a unified entitlement resolution layer that distinguishes admin-granted access from Stripe subscriptions, with a DB trigger to protect admin grants from being overwritten by Stripe webhooks. Minimal patches only — no file rewrites.

## Step 1 — SQL Migration

Run a single migration that:
- Adds `CHECK` constraint on `subscription_platform` column (already exists as text, add constraint for `'stripe'`, `'admin_grant'`, `'apple'`, `NULL`)
- Creates `is_admin_granted()` SECURITY DEFINER function: returns true when `subscription_platform = 'admin_grant'`
- Creates `protect_admin_grant` trigger on `user_profiles` BEFORE UPDATE: if OLD.subscription_platform = 'admin_grant' AND OLD.subscribed = true AND NEW tries to set subscribed = false or change platform away from admin_grant, reject by preserving OLD values
- Backfills: `UPDATE user_profiles SET subscription_platform = 'admin_grant' WHERE is_admin = true AND subscribed = true AND subscription_platform IS NULL`
- Backfills from `premium_email_list`: for each email in that table, find matching auth user, update their profile to `subscription_platform = 'admin_grant'` where not already set

**Safety**: All backfills use WHERE guards — existing paid/subscribed test users with `subscription_platform = 'stripe'` are untouched. Admin users already marked `admin_grant` are idempotent. Premium email list users get `admin_grant` only if their platform is NULL.

## Step 2 — Create `src/lib/entitlements.ts` (NEW file)

Types and pure function only — no React hooks:
```
EntitlementSource = 'stripe' | 'admin_grant' | 'none'
EntitlementResult = { hasPlus: boolean; source: EntitlementSource; expiresAt: string | null }
EntitlementProfile = { subscribed: boolean; subscription_platform: string | null; subscription_expires_at: string | null; is_admin: boolean }

resolveEntitlement(profile: EntitlementProfile): EntitlementResult
```

Resolution order:
1. `is_admin` = true → `{ hasPlus: true, source: 'admin_grant', expiresAt: null }`
2. `subscription_platform = 'admin_grant'` AND `subscribed = true` → `{ hasPlus: true, source: 'admin_grant', expiresAt: null }`
3. `subscribed = true` AND (no expiry OR expiry > now) → `{ hasPlus: true, source: 'stripe', expiresAt }`
4. Otherwise → `{ hasPlus: false, source: 'none', expiresAt: null }`

## Step 3 — Patch `src/lib/premiumAccess.ts` (MINIMAL changes)

**What changes:**
- Add `import { resolveEntitlement, type EntitlementResult, type EntitlementSource } from "@/lib/entitlements"` 
- Re-export the entitlement types for downstream use
- Modify `hasPremiumAccess()` to delegate to `resolveEntitlement()` internally when a full profile shape is available, but keep the existing `GateAccount` signature working
- Add `entitlementSource` to `PremiumAccessState` interface
- In `usePremiumAccess()`, add `entitlementSource` to return value

**What stays exactly the same (all 19 consumers unaffected):**
- `PUZZLECRAFT_PLUS_LAUNCHED`, `FREE_CRAFT_LIMIT_PER_MONTH`
- `FREE_DIFFICULTIES`, `PLUS_DIFFICULTIES`, `Difficulty`, `FreeDifficulty`
- `ENDLESS_REQUIRES_PLUS`, `FREE_ENDLESS_SESSION_CAP`
- `hasPremiumAccess()`, `shouldShowUpgradeCTA()`, `isDifficultyLocked()`, `getAvailableDifficulties()`
- `isEndlessLocked()`, `getEndlessSessionCap()`, `canSeeFullStats()`
- All craft limit functions
- `usePremiumAccess()` return shape (additive only — new `entitlementSource` field)

## Step 4 — Patch `src/contexts/UserAccountContext.tsx` (3 small changes)

1. Add `entitlementSource` state: `const [entitlementSource, setEntitlementSource] = useState<string | null>(null)`
2. In `refreshSubscription`, after getting `data` from check-subscription, also store `setEntitlementSource(data.source ?? null)`
3. Add `entitlementSource` to context type interface and Provider value
4. Expose in `useUserAccount()` return

## Step 5 — Update `check-subscription` edge function

Add `source` field to the response:
- Admin users: `{ subscribed: true, source: "admin_grant", subscription_end: null }`
- Users with `subscription_platform = 'admin_grant'` and `subscribed = true`: same
- Active Stripe subscribers: `{ subscribed: true, source: "stripe", subscription_end: ... }`
- Everyone else: `{ subscribed: false, source: "none", subscription_end: null }`

Keep existing response shape (`subscribed`, `subscription_end`) for backward compat — just add `source`.

## Step 6 — Update `stripe-webhook` edge function

Add admin-grant protection before each write:
- Before `checkout.session.completed` update: check if user's `subscription_platform = 'admin_grant'` — if so, skip the update (log and return)
- Before `customer.subscription.deleted` update: same check — don't revoke admin grants
- `invoice.paid` updates by `stripe_customer_id`, which admin-granted users won't have, so naturally safe

Also add `invoice.payment_failed` handler that sets `subscribed: false` (with same admin-grant check).

## Step 7 — Add `SubscriptionStatusBadge` to Account page

Small inline component (not a separate file) added to `Account.tsx`:
- Replace the existing `{(subscribed || isAdmin) && ...}` block (lines 196-227) with an enhanced version that shows:
  - Admin-granted users: "Puzzlecraft+" badge + "Granted by admin" subtitle, no "Manage Subscription" button
  - Stripe subscribers: existing behavior (renewal date + manage button)
  - Reads `entitlementSource` from `useUserAccount()`

No layout or structure changes elsewhere.

## Files Changed
1. **SQL migration** — new trigger, function, backfill
2. `src/lib/entitlements.ts` — NEW (pure types + function)
3. `src/lib/premiumAccess.ts` — PATCH (add import, re-export, add `entitlementSource` to hook)
4. `src/contexts/UserAccountContext.tsx` — PATCH (add `entitlementSource` state + context field)
5. `supabase/functions/check-subscription/index.ts` — PATCH (add `source` to response)
6. `supabase/functions/stripe-webhook/index.ts` — PATCH (add admin-grant guard)
7. `src/pages/Account.tsx` — PATCH (enhance subscription status display)

## Final Entitlement Resolution Order (plain English)

1. If the user's profile has `is_admin = true` → full access, source = "admin_grant", no expiry
2. If the user's `subscription_platform` is `"admin_grant"` and `subscribed` is true → full access, source = "admin_grant", no expiry (DB trigger prevents Stripe from overwriting this)
3. If `subscribed` is true and either no expiry date or expiry is in the future → full access, source = "stripe", expiry shown
4. Otherwise → no access, source = "none"

This runs identically in two places: the `check-subscription` edge function (authoritative) and `resolveEntitlement()` client-side (instant UI).

