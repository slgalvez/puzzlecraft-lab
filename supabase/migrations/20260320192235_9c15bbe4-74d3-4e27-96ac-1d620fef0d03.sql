UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['image/gif', 'image/png', 'image/jpeg', 'image/webp', 'audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'audio/wav']
WHERE id = 'chat-media';