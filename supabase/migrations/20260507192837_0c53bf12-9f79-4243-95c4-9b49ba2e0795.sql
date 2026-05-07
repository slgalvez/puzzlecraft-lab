CREATE TABLE public.bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  user_email text NULL,
  message text NOT NULL,
  route text NULL,
  user_agent text NULL,
  platform text NULL,
  ip_address text NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bug_reports_message_length CHECK (char_length(message) BETWEEN 10 AND 4000),
  CONSTRAINT bug_reports_status_check CHECK (status IN ('new','triaged','resolved'))
);

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read bug reports"
  ON public.bug_reports
  FOR SELECT
  TO authenticated
  USING (public.user_is_admin());

CREATE POLICY "Admins can update bug reports"
  ON public.bug_reports
  FOR UPDATE
  TO authenticated
  USING (public.user_is_admin())
  WITH CHECK (public.user_is_admin());

CREATE INDEX bug_reports_created_at_idx ON public.bug_reports (created_at DESC);
CREATE INDEX bug_reports_status_idx ON public.bug_reports (status);