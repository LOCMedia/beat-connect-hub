-- Add cover_image_url to contest_entries
ALTER TABLE public.contest_entries
  ADD COLUMN IF NOT EXISTS cover_image_url text;

-- Create entry-covers bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('entry-covers', 'entry-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Public can read entry covers
DROP POLICY IF EXISTS "Entry covers are publicly readable" ON storage.objects;
CREATE POLICY "Entry covers are publicly readable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'entry-covers');

-- Authed users can upload covers under their own user_id folder: entry-covers/<user_id>/<entry_id>.webp
DROP POLICY IF EXISTS "Users can upload own entry covers" ON storage.objects;
CREATE POLICY "Users can upload own entry covers"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'entry-covers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update own entry covers" ON storage.objects;
CREATE POLICY "Users can update own entry covers"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'entry-covers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete own entry covers" ON storage.objects;
CREATE POLICY "Users can delete own entry covers"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'entry-covers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);