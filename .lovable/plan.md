

# Stripe Webhook — Two Precise Logic Fixes

## Summary
Apply the user's exact two edits to `invoice.paid` and `invoice.payment_failed` while preserving the existing audit logging infrastructure (`logWebhookEvent`, tracking variables, audit inserts).

## Changes — single file: `supabase/functions/stripe-webhook/index.ts`

### Edit 1: `invoice.paid` (lines 113–160)

Replace the current block with the uploaded version's logic, keeping audit variables:

- Keep `auditCustomerId`, `auditSubscriptionId`, `auditUserId`, `auditStatus` assignments
- Keep admin_grant guard with `auditStatus = "skipped"`
- **Replace** the conditional `if (invoice.subscription)` inner block with:
  - Hard skip if `!invoice.subscription` (+ `auditStatus = "skipped"`)
  - Always retrieve sub object
  - Status gate: skip if `sub.status !== "active" && sub.status !== "trialing"` (+ `auditStatus = "skipped"`)
  - `const expiresAt` (not `let`) derived from already-retrieved sub
  - Updated log message includes expiry date
- Remove the `count === 0` warning branch (uploaded version doesn't have it — simpler logging)

### Edit 2: `invoice.payment_failed` (lines 200–248)

Replace the current block with the uploaded version's logic, keeping audit variables:

- Keep `auditCustomerId`, `auditSubscriptionId`, `auditUserId`, `auditStatus` assignments
- Keep admin_grant guard with `auditStatus = "skipped"`
- **Replace** the old conditional structure with:
  - Skip if `!invoice.subscription` (+ `auditStatus = "skipped"`)
  - Always retrieve sub object
  - Log sub status unconditionally
  - Single gate: `if (sub.status !== "canceled")` → skip (+ `auditStatus = "skipped"`)
  - DB update only runs when `canceled`
  - Log says "canceled after payment failed"

### What does NOT change
- `logWebhookEvent` helper function — untouched
- `checkout.session.completed` — byte-for-byte identical
- `customer.subscription.deleted` — byte-for-byte identical
- Audit insert points at end of try/catch — untouched
- No other files touched

## File changed

| File | Lines affected |
|------|---------------|
| `supabase/functions/stripe-webhook/index.ts` | ~113–160, ~200–248 |

