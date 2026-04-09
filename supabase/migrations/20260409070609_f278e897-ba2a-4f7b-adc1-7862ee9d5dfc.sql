-- ── 1. Friend codes on user_profiles ────────────────────────────────────
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS friend_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS friend_code_visible BOOLEAN DEFAULT true;

-- Auto-generate friend codes
CREATE OR REPLACE FUNCTION public.generate_friend_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT := 'PC-';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
  END LOOP;
  RETURN code;
END;
$$;

-- Trigger to auto-assign code on insert
CREATE OR REPLACE FUNCTION public.assign_friend_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.friend_code IS NULL THEN
    LOOP
      NEW.friend_code := generate_friend_code();
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.user_profiles WHERE friend_code = NEW.friend_code
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_friend_code ON public.user_profiles;
CREATE TRIGGER trg_assign_friend_code
  BEFORE INSERT ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_friend_code();

-- Back-fill existing users
DO $$
DECLARE
  rec RECORD;
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT;
  ok BOOLEAN;
BEGIN
  FOR rec IN SELECT id FROM public.user_profiles WHERE friend_code IS NULL LOOP
    ok := false;
    WHILE NOT ok LOOP
      code := 'PC-';
      FOR i IN 1..6 LOOP
        code := code || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
      END LOOP;
      ok := NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE friend_code = code);
    END LOOP;
    UPDATE public.user_profiles SET friend_code = code WHERE id = rec.id;
  END LOOP;
END $$;

-- ── 2. Friend requests table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID NOT NULL,
  receiver_id UUID NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sender_id, receiver_id),
  CHECK (sender_id <> receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_fr_sender   ON public.friend_requests (sender_id, status);
CREATE INDEX IF NOT EXISTS idx_fr_receiver ON public.friend_requests (receiver_id, status);

-- ── 3. Friendships table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.friendships (
  user_id_a  UUID NOT NULL,
  user_id_b  UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id_a, user_id_b),
  CHECK (user_id_a < user_id_b)
);

CREATE INDEX IF NOT EXISTS idx_friendships_a ON public.friendships (user_id_a);
CREATE INDEX IF NOT EXISTS idx_friendships_b ON public.friendships (user_id_b);

-- ── 4. Auto-create friendship when request is accepted ────────────────────
CREATE OR REPLACE FUNCTION public.handle_friend_request_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    INSERT INTO public.friendships (user_id_a, user_id_b)
    VALUES (
      LEAST(NEW.sender_id, NEW.receiver_id),
      GREATEST(NEW.sender_id, NEW.receiver_id)
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_friend_accepted ON public.friend_requests;
CREATE TRIGGER trg_friend_accepted
  AFTER UPDATE ON public.friend_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_friend_request_accepted();

-- ── 5. Row Level Security ─────────────────────────────────────────────────
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- friend_requests policies
CREATE POLICY "fr_select" ON public.friend_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "fr_insert" ON public.friend_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "fr_update" ON public.friend_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id AND status = 'pending');

CREATE POLICY "fr_delete" ON public.friend_requests
  FOR DELETE TO authenticated
  USING (auth.uid() = sender_id AND status = 'pending');

-- friendships policies
CREATE POLICY "fs_select" ON public.friendships
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id_a OR auth.uid() = user_id_b);

-- Delete friendships (unfriend)
CREATE POLICY "fs_delete" ON public.friendships
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id_a OR auth.uid() = user_id_b);

-- user_profiles: allow searching by friend_code or display_name
DROP POLICY IF EXISTS "up_search" ON public.user_profiles;
CREATE POLICY "up_search" ON public.user_profiles
  FOR SELECT USING (true);