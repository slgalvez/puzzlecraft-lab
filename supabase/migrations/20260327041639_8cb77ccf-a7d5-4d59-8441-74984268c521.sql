
CREATE TABLE public.location_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sharer_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewer_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accuracy double precision,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (sharer_profile_id, conversation_id)
);

ALTER TABLE public.location_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all access to location_shares"
  ON public.location_shares
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
