-- ── 1. type_leaderboard_entries table ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.type_leaderboard_entries (
  user_id          uuid        NOT NULL,
  puzzle_type      text        NOT NULL,
  display_name     text        NOT NULL DEFAULT 'Anonymous',
  rating           integer     NOT NULL DEFAULT 0,
  previous_rating  integer     NOT NULL DEFAULT 0,
  skill_tier       text        NOT NULL DEFAULT 'Beginner',
  solve_count      integer     NOT NULL DEFAULT 0,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, puzzle_type)
);

CREATE INDEX IF NOT EXISTS type_leaderboard_type_rating_idx
  ON public.type_leaderboard_entries (puzzle_type, rating DESC);

ALTER TABLE public.type_leaderboard_entries ENABLE ROW LEVEL SECURITY;

-- Everyone can read (same pattern as leaderboard_entries)
CREATE POLICY "type_leaderboard_select"
  ON public.type_leaderboard_entries FOR SELECT
  TO authenticated, anon
  USING (true);

-- No direct writes — only via SECURITY DEFINER RPC (no restrictive ALL policy)

-- ── 2. upsert_type_leaderboard_entry RPC ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.upsert_type_leaderboard_entry(
  p_user_id        uuid,
  p_puzzle_type    text,
  p_display_name   text,
  p_rating         integer,
  p_previous_rating integer,
  p_skill_tier     text,
  p_solve_count    integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_rating > 4000 THEN
    RAISE EXCEPTION 'Rating % exceeds maximum allowed value', p_rating;
  END IF;

  IF p_solve_count < 0 THEN
    RAISE EXCEPTION 'Invalid solve_count %', p_solve_count;
  END IF;

  INSERT INTO public.type_leaderboard_entries (
    user_id, puzzle_type, display_name, rating, previous_rating,
    skill_tier, solve_count, updated_at
  ) VALUES (
    p_user_id, p_puzzle_type, p_display_name, p_rating, p_previous_rating,
    p_skill_tier, p_solve_count, now()
  )
  ON CONFLICT (user_id, puzzle_type) DO UPDATE SET
    display_name    = EXCLUDED.display_name,
    previous_rating = public.type_leaderboard_entries.rating,
    rating          = EXCLUDED.rating,
    skill_tier      = EXCLUDED.skill_tier,
    solve_count     = EXCLUDED.solve_count,
    updated_at      = now()
  WHERE EXCLUDED.rating       != public.type_leaderboard_entries.rating
     OR EXCLUDED.solve_count  != public.type_leaderboard_entries.solve_count
     OR EXCLUDED.display_name != public.type_leaderboard_entries.display_name;
END;
$$;

-- ── 3. Update global RPC with rating cap ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.upsert_leaderboard_entry(
  p_user_id         uuid,
  p_display_name    text,
  p_rating          integer,
  p_previous_rating integer,
  p_skill_tier      text,
  p_solve_count     integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_rating > 4000 THEN
    RAISE EXCEPTION 'Rating % exceeds maximum allowed value', p_rating;
  END IF;

  IF p_solve_count < 0 THEN
    RAISE EXCEPTION 'Invalid solve_count %', p_solve_count;
  END IF;

  INSERT INTO public.leaderboard_entries (
    user_id, display_name, rating, previous_rating,
    skill_tier, solve_count, updated_at, rating_updated_at
  ) VALUES (
    p_user_id, p_display_name, p_rating, p_previous_rating,
    p_skill_tier, p_solve_count, now(), now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    display_name    = EXCLUDED.display_name,
    previous_rating = public.leaderboard_entries.rating,
    rating          = EXCLUDED.rating,
    skill_tier      = EXCLUDED.skill_tier,
    solve_count     = EXCLUDED.solve_count,
    updated_at      = now(),
    rating_updated_at = now()
  WHERE EXCLUDED.rating       != public.leaderboard_entries.rating
     OR EXCLUDED.solve_count  != public.leaderboard_entries.solve_count
     OR EXCLUDED.display_name != public.leaderboard_entries.display_name;
END;
$$;

-- ── 4. Recalculate existing tiers to new thresholds ─────────────────────────

UPDATE public.leaderboard_entries
SET skill_tier = CASE
  WHEN rating >= 1650 THEN 'Expert'
  WHEN rating >= 1300 THEN 'Advanced'
  WHEN rating >= 850  THEN 'Skilled'
  WHEN rating >= 650  THEN 'Casual'
  ELSE 'Beginner'
END
WHERE skill_tier != CASE
  WHEN rating >= 1650 THEN 'Expert'
  WHEN rating >= 1300 THEN 'Advanced'
  WHEN rating >= 850  THEN 'Skilled'
  WHEN rating >= 650  THEN 'Casual'
  ELSE 'Beginner'
END;

-- ── 5. Update display name trigger to include type_leaderboard_entries ───────

CREATE OR REPLACE FUNCTION public.propagate_display_name_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.display_name IS DISTINCT FROM OLD.display_name THEN
    UPDATE public.leaderboard_entries
    SET display_name = NEW.display_name
    WHERE user_id = NEW.id;

    UPDATE public.daily_scores
    SET display_name = NEW.display_name
    WHERE user_id = NEW.id;

    UPDATE public.type_leaderboard_entries
    SET display_name = NEW.display_name
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- ── 6. Admin view ───────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.leaderboard_summary AS
SELECT
  'global'    AS scope,
  NULL::text  AS puzzle_type,
  display_name,
  rating,
  skill_tier,
  solve_count,
  updated_at
FROM public.leaderboard_entries
UNION ALL
SELECT
  'type'        AS scope,
  puzzle_type,
  display_name,
  rating,
  skill_tier,
  solve_count,
  updated_at
FROM public.type_leaderboard_entries
ORDER BY scope, puzzle_type NULLS FIRST, rating DESC;