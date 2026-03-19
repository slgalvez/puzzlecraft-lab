-- Failed login attempts table
CREATE TABLE public.failed_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempted_name text NOT NULL,
  attempted_code text NOT NULL,
  ip_address text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all access to failed_login_attempts"
  ON public.failed_login_attempts
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- IP blocklist table
CREATE TABLE public.ip_blocklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL UNIQUE,
  blocked_at timestamptz NOT NULL DEFAULT now(),
  blocked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.ip_blocklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all access to ip_blocklist"
  ON public.ip_blocklist
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Index for fast IP lookups
CREATE INDEX idx_failed_login_ip ON public.failed_login_attempts(ip_address);
CREATE INDEX idx_failed_login_created ON public.failed_login_attempts(created_at DESC);