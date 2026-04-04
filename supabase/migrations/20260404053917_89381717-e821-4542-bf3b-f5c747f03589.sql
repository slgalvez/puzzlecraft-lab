
-- Helper function: checks if calling user has active subscription
CREATE OR REPLACE FUNCTION public.user_has_active_subscription()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (
      SELECT
        subscribed = true
        AND (subscription_expires_at IS NULL OR subscription_expires_at > now())
      FROM public.user_profiles
      WHERE id = auth.uid()
    ),
    false
  );
$$;

-- Helper function: checks if calling user is admin
CREATE OR REPLACE FUNCTION public.user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.user_profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Drop old leaderboard policies and replace with subscription-gated ones
DROP POLICY IF EXISTS "Anyone can read leaderboard" ON public.leaderboard_entries;
DROP POLICY IF EXISTS "Users can insert own leaderboard entry" ON public.leaderboard_entries;
DROP POLICY IF EXISTS "Users can update own display name" ON public.leaderboard_entries;
DROP POLICY IF EXISTS "Users can delete own leaderboard entry" ON public.leaderboard_entries;
DROP POLICY IF EXISTS "Anyone reads leaderboard" ON public.leaderboard_entries;
DROP POLICY IF EXISTS "Subscribers write own leaderboard" ON public.leaderboard_entries;
DROP POLICY IF EXISTS "Subscribers update own leaderboard" ON public.leaderboard_entries;

CREATE POLICY "Anyone reads leaderboard"
  ON public.leaderboard_entries FOR SELECT
  USING (true);

CREATE POLICY "Subscribers write own leaderboard"
  ON public.leaderboard_entries FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (public.user_has_active_subscription() OR public.user_is_admin())
  );

CREATE POLICY "Subscribers update own leaderboard"
  ON public.leaderboard_entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (public.user_has_active_subscription() OR public.user_is_admin())
  );

-- Drop old user_profiles policies and recreate cleanly
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.user_profiles;

CREATE POLICY "Users read own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Drop old daily_scores policies and recreate
DROP POLICY IF EXISTS "Anyone can read daily scores" ON public.daily_scores;
DROP POLICY IF EXISTS "Anyone reads daily scores" ON public.daily_scores;
DROP POLICY IF EXISTS "Users insert own score" ON public.daily_scores;
DROP POLICY IF EXISTS "Users update own score" ON public.daily_scores;

CREATE POLICY "Anyone reads daily scores"
  ON public.daily_scores FOR SELECT
  USING (true);

CREATE POLICY "Users insert own score"
  ON public.daily_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users update own score"
  ON public.daily_scores FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Unique constraint for daily_scores upsert
ALTER TABLE public.daily_scores
  DROP CONSTRAINT IF EXISTS daily_scores_date_user_unique;

ALTER TABLE public.daily_scores
  ADD CONSTRAINT daily_scores_date_user_unique
  UNIQUE (date_str, user_id);

-- Performance indexes
CREATE INDEX IF NOT EXISTS user_profiles_subscribed_idx
  ON public.user_profiles (id)
  WHERE subscribed = true;

CREATE INDEX IF NOT EXISTS user_profiles_expires_idx
  ON public.user_profiles (subscription_expires_at)
  WHERE subscription_expires_at IS NOT NULL;
