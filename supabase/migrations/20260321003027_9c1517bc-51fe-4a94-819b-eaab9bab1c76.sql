
CREATE TABLE public.craft_recipients (
  id text PRIMARY KEY,
  puzzle_id text NOT NULL REFERENCES public.shared_puzzles(id) ON DELETE CASCADE,
  recipient_name text NOT NULL DEFAULT '',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.craft_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read craft recipients"
  ON public.craft_recipients FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can insert craft recipients"
  ON public.craft_recipients FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can update craft recipient status"
  ON public.craft_recipients FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
