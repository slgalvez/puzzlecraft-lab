
CREATE TABLE public.custom_weekly_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  theme TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🧩',
  description TEXT NOT NULL DEFAULT '',
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  puzzles JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_weekly_packs ENABLE ROW LEVEL SECURITY;

-- Anyone can read packs (public display)
CREATE POLICY "Anyone can read custom weekly packs"
ON public.custom_weekly_packs
FOR SELECT
USING (true);

-- Only admins can manage packs
CREATE POLICY "Admins can insert custom weekly packs"
ON public.custom_weekly_packs
FOR INSERT
TO authenticated
WITH CHECK (public.user_is_admin());

CREATE POLICY "Admins can update custom weekly packs"
ON public.custom_weekly_packs
FOR UPDATE
TO authenticated
USING (public.user_is_admin());

CREATE POLICY "Admins can delete custom weekly packs"
ON public.custom_weekly_packs
FOR DELETE
TO authenticated
USING (public.user_is_admin());
