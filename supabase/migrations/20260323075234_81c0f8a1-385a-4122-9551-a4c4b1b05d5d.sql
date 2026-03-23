ALTER TABLE public.conversations
ADD COLUMN admin_typing_at timestamptz DEFAULT NULL,
ADD COLUMN user_typing_at timestamptz DEFAULT NULL;