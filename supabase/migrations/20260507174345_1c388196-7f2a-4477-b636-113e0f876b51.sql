
-- 1. Prevent privilege escalation on user_profiles via trigger
CREATE OR REPLACE FUNCTION public.protect_user_profile_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Preserve privileged fields against direct client UPDATE
  NEW.is_admin := OLD.is_admin;
  NEW.is_premium := OLD.is_premium;
  NEW.subscribed := OLD.subscribed;
  NEW.subscription_expires_at := OLD.subscription_expires_at;
  NEW.subscription_platform := OLD.subscription_platform;
  NEW.stripe_customer_id := OLD.stripe_customer_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_user_profile_privileged_fields ON public.user_profiles;
CREATE TRIGGER trg_protect_user_profile_privileged_fields
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
WHEN (current_setting('role', true) <> 'service_role')
EXECUTE FUNCTION public.protect_user_profile_privileged_fields();

-- 2. Tighten chat-media storage policies — require conversation participation
DROP POLICY IF EXISTS "Users can upload chat media" ON storage.objects;
DROP POLICY IF EXISTS "Users can read chat media" ON storage.objects;
DROP POLICY IF EXISTS "Anon can read chat media" ON storage.objects;

-- Files are stored as <conversation_id>/<uuid>.<ext>
CREATE POLICY "Participants can read chat media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-media'
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (c.user_profile_id = auth.uid() OR c.admin_profile_id = auth.uid())
  )
);

CREATE POLICY "Participants can upload chat media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-media'
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (c.user_profile_id = auth.uid() OR c.admin_profile_id = auth.uid())
  )
);

-- 3. Realtime: remove unused messages publication and lock down realtime.messages broadcasts
ALTER PUBLICATION supabase_realtime DROP TABLE public.messages;

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can use location topic for own conversations" ON realtime.messages;
CREATE POLICY "Authenticated can use location topic for own conversations"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE 'location:%'
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id::text = split_part(realtime.topic(), ':', 2)
      AND (c.user_profile_id = auth.uid() OR c.admin_profile_id = auth.uid())
  )
);
