

# Stripe Webhook Hardening — 4 Fixes from Verification Audit

## Summary
Apply 4 targeted fixes identified in the verification pass: 2 real bugs (immediate revoke on payment failure, missing admin guard on invoice.paid) and 2 hardening changes (auto-revoke guard in check-subscription, cleanup on subscription deletion). No UI changes. No schema changes.

## Fixes

### Fix 1 — `stripe-webhook`: Add admin_grant guard to `invoice.paid` (Bug 1+3)
Add the same admin_grant guard pattern used by the other 3 events. Also add 0-row warning and user_id logging.

### Fix 2 — `stripe-webhook`: Only revoke on final cancellation in `invoice.payment_failed` (Bug 4)
Instead of immediately setting `subscribed=false`, retrieve the Stripe subscription object and check `sub.status`. Only revoke if status is `"canceled"`. If `past_due` or `unpaid`, log and skip — Stripe is still retrying.

### Fix 3 — `check-subscription`: Add explicit `subscription_platform !== 'admin_grant'` guard before auto-revoke (Bug 6)
One condition added to the existing `if (profile.subscribed && isExpired)` block.

### Fix 4 — `stripe-webhook`: Clean up `subscription_expires_at` on `customer.subscription.deleted` (Bug 5)
Add `subscription_expires_at: null` to the update payload. Keeps `subscription_platform = 'stripe'` for history.

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/stripe-webhook/index.ts` | Fixes 1, 2, 4 |
| `supabase/functions/check-subscription/index.ts` | Fix 3 |

Both edge functions redeployed after changes.

## What Does NOT Change
- No database migration
- No frontend code changes
- No changes to `entitlements.ts`, `premiumAccess.ts`, or `UserAccountContext.tsx`
- All existing behavior for checkout.session.completed and admin_grant users is preserved

