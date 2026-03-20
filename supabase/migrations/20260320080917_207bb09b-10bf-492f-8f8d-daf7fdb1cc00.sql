CREATE TABLE public.contact_nicknames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contact_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nickname text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (owner_profile_id, contact_profile_id)
);

ALTER TABLE public.contact_nicknames ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all access to contact_nicknames"
  ON public.contact_nicknames
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);