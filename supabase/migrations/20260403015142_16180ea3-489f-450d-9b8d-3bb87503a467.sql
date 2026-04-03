ALTER TABLE public.craft_recipients
  ADD COLUMN IF NOT EXISTS solve_time integer,
  ADD COLUMN IF NOT EXISTS display_name text NOT NULL DEFAULT 'Anonymous';

CREATE INDEX IF NOT EXISTS idx_craft_recipients_puzzle_leaderboard
  ON public.craft_recipients (puzzle_id, solve_time)
  WHERE solve_time IS NOT NULL AND completed_at IS NOT NULL;