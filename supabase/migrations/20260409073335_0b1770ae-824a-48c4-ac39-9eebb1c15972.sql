
DROP POLICY IF EXISTS "fr_update" ON public.friend_requests;

CREATE POLICY "fr_update"
ON public.friend_requests
FOR UPDATE
TO authenticated
USING (auth.uid() = receiver_id AND status = 'pending')
WITH CHECK (auth.uid() = receiver_id AND status IN ('accepted', 'declined'));
