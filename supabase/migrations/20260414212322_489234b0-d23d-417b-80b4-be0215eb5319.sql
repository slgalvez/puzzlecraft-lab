
-- 1. Add CHECK constraint on subscription_platform
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_subscription_platform_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_subscription_platform_check
  CHECK (subscription_platform IS NULL OR subscription_platform IN ('stripe', 'admin_grant', 'apple'));

-- 2. Create is_admin_granted() SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.is_admin_granted(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT subscription_platform = 'admin_grant' AND subscribed = true
      FROM public.user_profiles
      WHERE id = _user_id
    ),
    false
  );
$$;

-- 3. Create protect_admin_grant trigger function
CREATE OR REPLACE FUNCTION public.protect_admin_grant_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the row is currently an admin grant with active subscription,
  -- prevent external systems from revoking it
  IF OLD.subscription_platform = 'admin_grant'
     AND OLD.subscribed = true
     AND (NEW.subscribed = false OR (NEW.subscription_platform IS DISTINCT FROM 'admin_grant' AND NEW.subscription_platform IS NOT NULL))
  THEN
    -- Preserve the admin grant values
    NEW.subscribed := OLD.subscribed;
    NEW.subscription_platform := OLD.subscription_platform;
    NEW.subscription_expires_at := OLD.subscription_expires_at;
    NEW.is_premium := OLD.is_premium;
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Attach the trigger
DROP TRIGGER IF EXISTS protect_admin_grant ON public.user_profiles;
CREATE TRIGGER protect_admin_grant
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_admin_grant_fn();

-- 5. Backfill: admins with subscribed=true but no platform set
UPDATE public.user_profiles
SET subscription_platform = 'admin_grant'
WHERE is_admin = true
  AND subscribed = true
  AND (subscription_platform IS NULL);

-- 6. Backfill: premium email list users
UPDATE public.user_profiles up
SET subscription_platform = 'admin_grant',
    subscribed = true,
    is_premium = true
FROM auth.users au
JOIN public.premium_email_list pel ON lower(pel.email) = lower(au.email)
WHERE up.id = au.id
  AND (up.subscription_platform IS NULL);
