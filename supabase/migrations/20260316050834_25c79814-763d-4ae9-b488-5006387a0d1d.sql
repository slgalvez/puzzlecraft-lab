
-- Security hardening: Deny all direct client access to private tables.
-- All legitimate access goes through edge functions using the service role key.

-- authorized_users: No client access needed
CREATE POLICY "Deny all access to authorized_users"
ON public.authorized_users
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- profiles: No client access needed
CREATE POLICY "Deny all access to profiles"
ON public.profiles
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- conversations: No client access needed
CREATE POLICY "Deny all access to conversations"
ON public.conversations
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- messages: No client access needed
CREATE POLICY "Deny all access to messages"
ON public.messages
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- access_logs: No client access needed
CREATE POLICY "Deny all access to access_logs"
ON public.access_logs
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);
