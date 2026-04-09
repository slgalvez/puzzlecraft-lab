
-- Ensure premium_email_list exists with the expected schema
CREATE TABLE IF NOT EXISTS premium_email_list (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL UNIQUE,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE premium_email_list ENABLE ROW LEVEL SECURITY;

-- Only service role / edge functions access this table
CREATE POLICY "Deny direct access to premium_email_list"
ON premium_email_list
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- Trigger function
CREATE OR REPLACE FUNCTION grant_premium_if_listed()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  is_listed  BOOLEAN;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = NEW.id;

  SELECT EXISTS (
    SELECT 1 FROM premium_email_list
    WHERE lower(email) = lower(user_email)
  ) INTO is_listed;

  IF is_listed THEN
    NEW.subscribed             := true;
    NEW.is_premium             := true;
    NEW.subscription_platform  := 'admin_grant';
    NEW.subscription_expires_at := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Drop and recreate to ensure it's current
DROP TRIGGER IF EXISTS trg_grant_premium_on_signup ON user_profiles;

CREATE TRIGGER trg_grant_premium_on_signup
  BEFORE INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION grant_premium_if_listed();

-- One-time backfill
UPDATE user_profiles up
SET
  subscribed             = true,
  is_premium             = true,
  subscription_platform  = 'admin_grant',
  subscription_expires_at = NULL,
  updated_at             = NOW()
FROM auth.users au
JOIN premium_email_list pel ON lower(au.email) = lower(pel.email)
WHERE up.id = au.id
  AND (up.subscribed IS NULL OR up.subscribed = false);
