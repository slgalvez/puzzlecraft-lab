CREATE TABLE public.admin_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_push_at timestamptz,
  UNIQUE (user_id, endpoint)
);

CREATE INDEX idx_admin_push_user ON public.admin_push_subscriptions(user_id);

ALTER TABLE public.admin_push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read own admin push subs"
ON public.admin_push_subscriptions
FOR SELECT TO authenticated
USING (auth.uid() = user_id AND user_is_admin());

CREATE POLICY "Admins delete own admin push subs"
ON public.admin_push_subscriptions
FOR DELETE TO authenticated
USING (auth.uid() = user_id AND user_is_admin());