
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, is_premium)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    CASE WHEN NEW.email = 'missamiyah.ay@gmail.com' THEN true ELSE false END
  );
  
  INSERT INTO public.user_progress (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$function$;

-- If the user already exists, grant premium
UPDATE public.user_profiles
SET is_premium = true
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'missamiyah.ay@gmail.com'
);
