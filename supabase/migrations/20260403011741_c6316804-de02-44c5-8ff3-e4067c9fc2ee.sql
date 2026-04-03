ALTER TABLE public.shared_puzzles
  ADD COLUMN IF NOT EXISTS solve_time integer,
  ADD COLUMN IF NOT EXISTS creator_solve_time integer,
  ADD COLUMN IF NOT EXISTS creator_solved_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_shared_puzzles_solve_time
  ON public.shared_puzzles (solve_time)
  WHERE solve_time IS NOT NULL;