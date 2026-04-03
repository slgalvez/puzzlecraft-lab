
-- ============================================================
-- 1. LEADERBOARD: Replace broad UPDATE with server-side RPC
-- ============================================================

-- Drop the overly permissive UPDATE policy
DROP POLICY IF EXISTS "Users can update own leaderboard entry" ON public.leaderboard_entries;

-- Create a security definer function for rating updates (server-side only)
CREATE OR REPLACE FUNCTION public.upsert_leaderboard_entry(
  p_user_id uuid,
  p_display_name text,
  p_rating integer,
  p_previous_rating integer,
  p_skill_tier text,
  p_solve_count integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.leaderboard_entries (user_id, display_name, rating, previous_rating, skill_tier, solve_count, updated_at, rating_updated_at)
  VALUES (p_user_id, p_display_name, p_rating, p_previous_rating, p_skill_tier, p_solve_count, now(), now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    display_name = EXCLUDED.display_name,
    rating = EXCLUDED.rating,
    previous_rating = EXCLUDED.previous_rating,
    skill_tier = EXCLUDED.skill_tier,
    solve_count = EXCLUDED.solve_count,
    updated_at = now(),
    rating_updated_at = now();
END;
$$;

-- Add a narrow UPDATE policy for display_name only (optional self-service rename)
CREATE POLICY "Users can update own display name"
  ON public.leaderboard_entries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 2. CONVERT PERMISSIVE DENY TO RESTRICTIVE DENY (10 tables)
-- ============================================================

-- conversations
DROP POLICY IF EXISTS "Deny all access to conversations" ON public.conversations;
CREATE POLICY "Deny all access to conversations"
  ON public.conversations AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- messages
DROP POLICY IF EXISTS "Deny all access to messages" ON public.messages;
CREATE POLICY "Deny all access to messages"
  ON public.messages AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- profiles
DROP POLICY IF EXISTS "Deny all access to profiles" ON public.profiles;
CREATE POLICY "Deny all access to profiles"
  ON public.profiles AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- access_logs
DROP POLICY IF EXISTS "Deny all access to access_logs" ON public.access_logs;
CREATE POLICY "Deny all access to access_logs"
  ON public.access_logs AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- private_puzzles
DROP POLICY IF EXISTS "Deny all access to private_puzzles" ON public.private_puzzles;
CREATE POLICY "Deny all access to private_puzzles"
  ON public.private_puzzles AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- call_signals
DROP POLICY IF EXISTS "Deny all access to call_signals" ON public.call_signals;
CREATE POLICY "Deny all access to call_signals"
  ON public.call_signals AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- calls
DROP POLICY IF EXISTS "Deny all access to calls" ON public.calls;
CREATE POLICY "Deny all access to calls"
  ON public.calls AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- contact_nicknames
DROP POLICY IF EXISTS "Deny all access to contact_nicknames" ON public.contact_nicknames;
CREATE POLICY "Deny all access to contact_nicknames"
  ON public.contact_nicknames AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- push_subscriptions
DROP POLICY IF EXISTS "Deny all access to push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Deny all access to push_subscriptions"
  ON public.push_subscriptions AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- location_shares
DROP POLICY IF EXISTS "Deny all access to location_shares" ON public.location_shares;
CREATE POLICY "Deny all access to location_shares"
  ON public.location_shares AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);
