
-- Create authorized_users table for custom authentication
CREATE TABLE public.authorized_users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name text NOT NULL,
  last_name text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add unique constraint on first_name + last_name combo
CREATE UNIQUE INDEX authorized_users_name_idx ON public.authorized_users (lower(first_name), lower(last_name));

-- Enable RLS but no public policies (only accessed via service role in edge function)
ALTER TABLE public.authorized_users ENABLE ROW LEVEL SECURITY;
