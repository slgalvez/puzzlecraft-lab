

# Add `webhook_events` Audit Table

## Summary
Create a `webhook_events` table with a unique `event_id` constraint, and insert one audit row per processed Stripe webhook event. Backend only, no UI, no refactors.

## Step 1 — SQL Migration

```sql
CREATE TABLE public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  supabase_user_id uuid,
  processed_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'success'
    CHECK (status IN ('success', 'skipped', 'error')),
  error_message text
);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all client access to webhook_events"
  ON public.webhook_events FOR ALL
  TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE INDEX idx_webhook_events_processed_at
  ON public.webhook_events (processed_at DESC);
```

- `event_id` is `UNIQUE` (dedup / lookup by Stripe event ID)
- `status` constrained to `success`, `skipped`, `error`
- RLS denies all client access; only `service_role` can read/write
- Index on `processed_at` for forensic queries

## Step 2 — Patch `stripe-webhook/index.ts`

Add a `logWebhookEvent` helper at the top (after the `supabase` client):

```ts
async function logWebhookEvent(fields: {
  event_id: string; event_type: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  supabase_user_id?: string | null;
  status: "success" | "skipped" | "error";
  error_message?: string | null;
}) {
  const { error } = await supabase.from("webhook_events").insert({ ... });
  if (error) console.error("[stripe-webhook] Audit log insert failed:", error);
}
```

Then add three tracking variables before the `switch`:
```ts
let auditCustomerId: string | null = null;
let auditSubscriptionId: string | null = null;
let auditUserId: string | null = null;
let auditStatus: "success" | "skipped" | "error" = "success";
```

Within each `case` branch, assign these variables as data becomes available. When a branch hits an admin-grant guard or missing-data early return, set `auditStatus = "skipped"`.

Two audit insert points:
1. **Success/skipped path** — after the `switch`, before the 200 response
2. **Error path** — in the `catch` block, before the 500 response, with `status: "error"` and `error_message`

No changes to any webhook logic — only variable assignments and the final insert.

## Files Changed

| File | Change |
|------|--------|
| SQL migration | New `webhook_events` table |
| `supabase/functions/stripe-webhook/index.ts` | Add audit helper + tracking vars + 2 insert calls |

