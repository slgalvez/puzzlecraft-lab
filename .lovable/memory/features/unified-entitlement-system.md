---
name: Unified entitlement system
description: Admin-grant vs Stripe entitlement resolution with DB trigger protection
type: feature
---
## Entitlement Resolution Order
1. `is_admin = true` → admin_grant (no expiry)
2. `subscription_platform = 'admin_grant'` AND `subscribed = true` → admin_grant (DB-trigger protected)
3. `subscribed = true` AND valid expiry → stripe
4. Otherwise → none

## Key Files
- `src/lib/entitlements.ts` — pure `resolveEntitlement()` function
- `src/lib/premiumAccess.ts` — React hook delegates to entitlements, exposes `entitlementSource`
- `src/contexts/UserAccountContext.tsx` — stores `entitlementSource` from check-subscription response

## DB Protection
- `protect_admin_grant` trigger on `user_profiles` BEFORE UPDATE prevents revoking admin_grant rows
- `is_admin_granted(_user_id)` SECURITY DEFINER function for server-side checks
- CHECK constraint: `subscription_platform` must be NULL, 'stripe', 'admin_grant', or 'apple'

## Edge Functions
- `check-subscription` returns `source` field (admin_grant | stripe | none)
- `stripe-webhook` checks subscription_platform before writing; skips admin_grant users
- Handles: checkout.session.completed, invoice.paid, customer.subscription.deleted, invoice.payment_failed

## Account Page
- Source-aware status badge: admin-granted shows "Granted by admin", Stripe shows renewal date + manage button
