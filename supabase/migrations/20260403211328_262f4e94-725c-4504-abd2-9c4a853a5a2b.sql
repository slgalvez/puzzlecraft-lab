ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS rating       integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_tier  text    DEFAULT 'beginner',
  ADD COLUMN IF NOT EXISTS solves_count integer DEFAULT 0;

CREATE INDEX IF NOT EXISTS user_profiles_rating_idx
  ON public.user_profiles (rating DESC);