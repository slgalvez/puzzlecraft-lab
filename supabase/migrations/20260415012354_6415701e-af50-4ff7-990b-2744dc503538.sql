CREATE OR REPLACE FUNCTION public.admin_get_user_progress(p_user_id uuid)
RETURNS TABLE(completions jsonb, solves jsonb, daily_data jsonb, endless_data jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT completions, solves, daily_data, endless_data
  FROM public.user_progress
  WHERE user_id = p_user_id
    AND (SELECT is_admin FROM public.user_profiles WHERE id = auth.uid()) = true
$$;