
CREATE TABLE public.shared_puzzles (
  id text PRIMARY KEY,
  payload jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_puzzles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert shared puzzles"
  ON public.shared_puzzles
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read shared puzzles"
  ON public.shared_puzzles
  FOR SELECT
  TO anon, authenticated
  USING (true);
