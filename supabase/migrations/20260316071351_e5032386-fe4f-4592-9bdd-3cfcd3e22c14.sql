
-- Drop the existing permissive deny-all policy
DROP POLICY IF EXISTS "Deny all access to authorized_users" ON public.authorized_users;

-- Recreate as RESTRICTIVE so it cannot be bypassed by any future permissive policy
CREATE POLICY "Deny all access to authorized_users"
ON public.authorized_users
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);
