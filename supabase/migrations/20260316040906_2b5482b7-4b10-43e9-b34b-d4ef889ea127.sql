-- Add disappearing message fields to conversations
ALTER TABLE public.conversations
ADD COLUMN disappearing_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN disappearing_duration text NOT NULL DEFAULT '24h',
ADD COLUMN disappearing_enabled_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN disappearing_updated_at timestamptz DEFAULT now();

-- Add expires_at and is_disappearing to messages
ALTER TABLE public.messages
ADD COLUMN expires_at timestamptz DEFAULT NULL,
ADD COLUMN is_disappearing boolean NOT NULL DEFAULT false;