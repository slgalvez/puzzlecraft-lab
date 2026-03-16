
-- Drop existing trigger and function for old profile auto-creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Drop old RLS policies on profiles
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Drop old profiles table
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop old approved_users table (replaced by authorized_users)
DROP FUNCTION IF EXISTS public.is_user_approved(text);
DROP TABLE IF EXISTS public.approved_users CASCADE;

-- Add is_active to authorized_users
ALTER TABLE public.authorized_users ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Create new profiles table linked to authorized_users
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  authorized_user_id uuid NOT NULL REFERENCES public.authorized_users(id) ON DELETE CASCADE UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create conversations table
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  admin_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Create messages table
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create access_logs table
CREATE TABLE public.access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  success boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX messages_conversation_created_idx ON public.messages(conversation_id, created_at);
CREATE INDEX messages_conversation_read_idx ON public.messages(conversation_id, read_at);
CREATE INDEX access_logs_profile_idx ON public.access_logs(profile_id, created_at);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Drop old update_updated_at function if unused
DROP FUNCTION IF EXISTS public.update_updated_at_column();
