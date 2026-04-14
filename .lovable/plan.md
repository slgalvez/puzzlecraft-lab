

# Stripe Webhook for Puzzlecraft+ Subscriptions

## What This Does
Creates a backend webhook endpoint that Stripe calls automatically whenever a subscription event occurs. This is the secure, server-side way to grant and revoke Puzzlecraft+ access — instead of relying on the user landing on a success URL.

## Technical Plan

### 1. Add STRIPE_WEBHOOK_SECRET secret
The webhook needs a signing secret to verify requests actually come from Stripe. You'll need to grab this from your Stripe Dashboard (Developers → Webhooks) after creating the endpoint. The endpoint URL will be:
`https://nkfxdupsbxgbclsgseez.supabase.co/functions/v1/stripe-webhook`

### 2. Create edge function: `supabase/functions/stripe-webhook/index.ts`

Handles three Stripe events:

- **`checkout.session.completed`** — A user just finished checkout. Reads `client_reference_id` or `metadata.supabase_user_id` to find the user. Also stores the Stripe customer ID. Retrieves the subscription from Stripe to get `current_period_end`. Updates `user_profiles`: `subscribed = true`, `subscription_platform = 'stripe'`, `subscription_expires_at`, `stripe_customer_id`.

- **`invoice.paid`** — A renewal payment succeeded. Looks up the user by `stripe_customer_id` in `user_profiles`. Updates `subscription_expires_at` to the new `current_period_end`. Keeps `subscribed = true`.

- **`customer.subscription.deleted`** — Subscription cancelled/expired. Looks up user by `stripe_customer_id`. Sets `subscribed = false`.

Key security details:
- Verifies Stripe signature using `stripe.webhooks.constructEventAsync()` with the webhook secret
- Uses service role key for database writes (bypasses RLS)
- No CORS needed (Stripe calls server-to-server)
- No JWT verification (Stripe doesn't send auth headers)
- Returns 200 for unhandled event types (Stripe best practice)

### 3. Configure function in `supabase/config.toml`
Add `[functions.stripe-webhook]` with `verify_jwt = false` since Stripe sends raw POST requests without a Supabase JWT.

### 4. No frontend changes needed
The existing `check-subscription` polling (every 60s) will automatically pick up the database changes made by the webhook. The `refreshSubscription` call on page load also catches it.

## After Deployment
You'll need to:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://nkfxdupsbxgbclsgseez.supabase.co/functions/v1/stripe-webhook`
3. Select events: `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`
4. Copy the signing secret and add it as `STRIPE_WEBHOOK_SECRET`

