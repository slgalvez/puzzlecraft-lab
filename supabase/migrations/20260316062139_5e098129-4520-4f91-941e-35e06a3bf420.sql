
CREATE TABLE public.private_puzzles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sent_to uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  puzzle_type text NOT NULL CHECK (puzzle_type IN ('word-fill', 'cryptogram', 'crossword', 'word-search')),
  puzzle_data jsonb NOT NULL,
  reveal_message text,
  solved_by uuid REFERENCES public.profiles(id),
  solved_at timestamp with time zone,
  solve_time integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.private_puzzles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all access to private_puzzles"
  ON public.private_puzzles
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE INDEX idx_private_puzzles_created_by ON public.private_puzzles(created_by);
CREATE INDEX idx_private_puzzles_sent_to ON public.private_puzzles(sent_to);
