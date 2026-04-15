

# Stripe Webhook: Clean up `invoice.payment_failed` revocation

## Problem
In `stripe-webhook/index.ts`, the `invoice.payment_failed` handler sets `subscribed: false` when revoking access for a canceled subscription, but does not clear `subscription_expires_at`. The `customer.subscription.deleted` handler already does this correctly.

## Change

**File:** `supabase/functions/stripe-webhook/index.ts`

In the `invoice.payment_failed` case (around line 188), change:
```ts
.update({ subscribed: false })
```
to:
```ts
.update({ subscribed: false, subscription_expires_at: null })
```

One line changed. Nothing else.

