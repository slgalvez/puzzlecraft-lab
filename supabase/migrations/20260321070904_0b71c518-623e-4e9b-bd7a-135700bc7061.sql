
CREATE TABLE public.leaderboard_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  display_name text NOT NULL DEFAULT 'Anonymous',
  rating integer NOT NULL DEFAULT 0,
  skill_tier text NOT NULL DEFAULT 'Beginner',
  solve_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;

-- Anyone can read the leaderboard
CREATE POLICY "Anyone can read leaderboard"
  ON public.leaderboard_entries
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can upsert their own entry
CREATE POLICY "Users can insert own leaderboard entry"
  ON public.leaderboard_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leaderboard entry"
  ON public.leaderboard_entries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
