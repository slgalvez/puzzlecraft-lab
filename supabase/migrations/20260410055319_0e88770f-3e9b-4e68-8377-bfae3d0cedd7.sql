
-- Function to propagate display_name changes to all leaderboard tables
CREATE OR REPLACE FUNCTION public.propagate_display_name_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.display_name IS DISTINCT FROM OLD.display_name THEN
    -- Update leaderboard_entries
    UPDATE public.leaderboard_entries
    SET display_name = NEW.display_name
    WHERE user_id = NEW.id;

    -- Update daily_scores
    UPDATE public.daily_scores
    SET display_name = NEW.display_name
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger on user_profiles
CREATE TRIGGER on_display_name_change
AFTER UPDATE OF display_name ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.propagate_display_name_change();
