
-- Table for admin-managed premium email whitelist
CREATE TABLE public.premium_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.premium_emails ENABLE ROW LEVEL SECURITY;

-- Only service_role (edge functions) can access this table
CREATE POLICY "Deny all access to premium_emails"
  ON public.premium_emails
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Seed the existing whitelisted email
INSERT INTO public.premium_emails (email, note)
VALUES ('missamiyah.ay@gmail.com', 'Founding member');

-- Update signup trigger to check premium_emails table
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _is_premium boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.premium_emails WHERE email = NEW.email
  ) INTO _is_premium;

  INSERT INTO public.user_profiles (id, display_name, is_premium)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    _is_premium
  );

  INSERT INTO public.user_progress (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$function$;
