ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS subscribed              boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_platform   text,
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_customer_id      text;

CREATE INDEX IF NOT EXISTS user_profiles_subscribed_idx
  ON public.user_profiles (id) WHERE subscribed = true;