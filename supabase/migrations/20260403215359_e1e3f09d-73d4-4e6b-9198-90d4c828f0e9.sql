ALTER TABLE public.daily_scores
  ADD CONSTRAINT daily_scores_date_user_unique UNIQUE (date_str, user_id);

CREATE POLICY "Users update own score"
  ON public.daily_scores FOR UPDATE
  USING (auth.uid() = user_id);