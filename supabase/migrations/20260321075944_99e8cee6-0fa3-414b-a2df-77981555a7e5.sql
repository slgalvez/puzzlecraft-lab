CREATE POLICY "Users can delete own leaderboard entry"
ON public.leaderboard_entries
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);