
ALTER TABLE public.shared_puzzles
  ADD COLUMN started_at timestamptz,
  ADD COLUMN completed_at timestamptz;

CREATE POLICY "Anyone can update solve status on shared puzzles"
  ON public.shared_puzzles
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
