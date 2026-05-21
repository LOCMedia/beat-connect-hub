
-- Drop old constraint first so existing 'open_verse' rows are valid during update
ALTER TABLE public.sponsored_challenges
  DROP CONSTRAINT IF EXISTS sponsored_challenges_challenge_type_check;

UPDATE public.sponsored_challenges
  SET challenge_type = 'open_verse'
  WHERE challenge_type IN ('freestyle','follow');

ALTER TABLE public.sponsored_challenges
  ADD CONSTRAINT sponsored_challenges_challenge_type_check
  CHECK (challenge_type IN ('dance','open_verse'));

ALTER TABLE public.sponsored_challenges
  ADD COLUMN IF NOT EXISTS beat_upload_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('sponsored-beats', 'sponsored-beats', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Sponsors upload own beats" ON storage.objects;
DROP POLICY IF EXISTS "Sponsors update own beats" ON storage.objects;
DROP POLICY IF EXISTS "Sponsors delete own beats" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read sponsored beats" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage sponsored beats" ON storage.objects;

CREATE POLICY "Sponsors upload own beats"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'sponsored-beats' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Sponsors update own beats"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'sponsored-beats' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Sponsors delete own beats"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'sponsored-beats' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated read sponsored beats"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'sponsored-beats');

CREATE POLICY "Admins manage sponsored beats"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'sponsored-beats' AND public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'sponsored-beats' AND public.has_role(auth.uid(), 'admin'::app_role));
