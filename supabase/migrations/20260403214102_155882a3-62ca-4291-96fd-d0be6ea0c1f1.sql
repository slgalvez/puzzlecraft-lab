CREATE TABLE IF NOT EXISTS public.daily_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date_str text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  display_name text,
  solve_time integer NOT NULL,
  puzzle_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS daily_scores_date_time_idx
  ON public.daily_scores (date_str, solve_time ASC);

ALTER TABLE public.daily_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read daily scores"
  ON public.daily_scores FOR SELECT USING (true);

CREATE POLICY "Users insert own score"
  ON public.daily_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);