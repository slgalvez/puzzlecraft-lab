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