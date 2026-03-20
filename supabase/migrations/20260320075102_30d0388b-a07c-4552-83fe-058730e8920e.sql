
CREATE TABLE public.calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  caller_profile_id uuid NOT NULL REFERENCES public.profiles(id),
  callee_profile_id uuid NOT NULL REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'ringing',
  started_at timestamptz NOT NULL DEFAULT now(),
  connected_at timestamptz,
  ended_at timestamptz,
  end_reason text
);

ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to calls" ON public.calls FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE TABLE public.call_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  sender_profile_id uuid NOT NULL REFERENCES public.profiles(id),
  signal_type text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to call_signals" ON public.call_signals FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
