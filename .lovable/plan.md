# Fix: Stuck-locked subscription + plan switching

## What's broken

1. Your Stripe subscription is **active** (`sub_1TUWKy…`, $2.99/mo) but your `user_profiles` row was never updated, so the app still shows the upgrade badge and locked features.
2. The `stripe-webhook` function has **never been invoked** — no logs, no `webhook_events` rows. The webhook endpoint in Stripe isn't reaching us (either not configured, or `STRIPE_WEBHOOK_SECRET` doesn't match).
3. There's no in-app way to switch Monthly ↔ Annual once subscribed.

## Plan

### Part A — Make subscription detection self-healing (primary fix)

Today, `check-subscription` only reads our DB. If the webhook misses, the user is stuck forever even though they paid. Fix this by having `check-subscription` reconcile against Stripe directly when the DB looks unsubscribed.

Update `supabase/functions/check-subscription/index.ts`:
- After the existing DB check, if `subscribed=false` and `subscription_platform != 'admin_grant'`, query Stripe:
  - `stripe.customers.list({ email: user.email, limit: 1 })`
  - If a customer exists, `stripe.subscriptions.list({ customer, status: 'active', limit: 1 })`
  - If an active sub is found, **update `user_profiles`** with `subscribed=true`, `stripe_customer_id`, `subscription_platform='stripe'`, `subscription_expires_at = current_period_end`, and return `subscribed: true`.
- This makes the system self-healing — no more user stuck after a missed webhook.

### Part B — Heal your current account immediately

After the function is updated, your next page load will reconcile and unlock everything. No DB migration needed; the function will write the correct row.

### Part C — Surface the webhook configuration issue

Add a one-line note to `SUBSCRIPTION_ARCHITECTURE.md` explaining how to verify the webhook endpoint is set in Stripe Dashboard → Developers → Webhooks, pointing at:
`https://nkfxdupsbxgbclsgseez.supabase.co/functions/v1/stripe-webhook`
listening for `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`, `invoice.payment_failed`, with `STRIPE_WEBHOOK_SECRET` matching that endpoint's signing secret.

(I won't try to configure Stripe Dashboard from code — that's a one-click step you do in Stripe.)

### Part D — In-app plan switcher (Monthly ↔ Annual)

Inside `src/pages/Account.tsx`, when the user is already subscribed via Stripe (not admin_grant, not Apple), show a small "Change plan" affordance under the subscription status card with two options:
- Switch to Annual ($19.99/yr) — only shown if currently monthly
- Switch to Monthly ($2.99/mo) — only shown if currently annual

This calls a new edge function `change-subscription-plan` that:
- Looks up the active subscription for the authenticated user
- Calls `stripe.subscriptions.update(sub_id, { items: [{ id: <existing item id>, price: <new price id> }], proration_behavior: 'create_prorations' })`
- Returns success; the front end then calls `refreshSubscription()`.

Keep the existing **Manage subscription** button (opens Stripe Customer Portal) for cancel/payment-method/invoices.

## Technical details

- Files changed:
  - `supabase/functions/check-subscription/index.ts` — add Stripe reconciliation fallback + DB write.
  - `supabase/functions/change-subscription-plan/index.ts` — NEW.
  - `supabase/config.toml` — leave default (`verify_jwt = true`) for `change-subscription-plan` so only authenticated users can switch.
  - `src/pages/Account.tsx` — add "Change plan" UI below the active-subscription card.
  - `SUBSCRIPTION_ARCHITECTURE.md` — short note on webhook setup.
- Price IDs to use (already in code):
  - Monthly: `price_1TDHYZI2mQ3QaWmEly0lqHqQ`
  - Annual:  `price_1TMDohI2mQ3QaWmEMXCAR3FH`
- The reconciliation call in `check-subscription` only fires when the DB says unsubscribed, so it's not on the hot path for already-subscribed users.

## What this won't do

- Won't auto-fix your Stripe webhook endpoint — you'll still want to verify that in the Stripe Dashboard so future signups don't depend on the polling fallback.
- Won't add Apple IAP plan switching (native flow, separate work).
