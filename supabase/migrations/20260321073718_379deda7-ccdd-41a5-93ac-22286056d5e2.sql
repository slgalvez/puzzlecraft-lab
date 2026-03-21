ALTER TABLE public.leaderboard_entries 
ADD COLUMN previous_rating integer NOT NULL DEFAULT 0,
ADD COLUMN rating_updated_at timestamp with time zone NOT NULL DEFAULT now();