-- Create private storage bucket for chat media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat-media', 'chat-media', false, 10485760, ARRAY['image/gif', 'image/png', 'image/jpeg', 'image/webp']);

-- RLS: Allow authenticated users to upload chat media
CREATE POLICY "Users can upload chat media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-media');

-- RLS: Allow authenticated users to read chat media
CREATE POLICY "Users can read chat media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat-media');

-- Allow anon to read chat media (edge functions serve signed URLs)
CREATE POLICY "Anon can read chat media"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'chat-media');