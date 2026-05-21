
-- FIX 2: commission as percentage
ALTER TABLE public.sponsored_challenges
  ADD COLUMN IF NOT EXISTS commission_percent numeric(5,2) NOT NULL DEFAULT 20;

-- FIX 4: media uploads on submissions
ALTER TABLE public.challenge_submissions
  ADD COLUMN IF NOT EXISTS video_upload_url text,
  ADD COLUMN IF NOT EXISTS audio_upload_url text;

-- App settings (single-row, global commission default)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  default_commission_percent numeric(5,2) NOT NULL DEFAULT 20,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.app_settings (id, default_commission_percent)
VALUES (true, 20)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "App settings public read" ON public.app_settings;
CREATE POLICY "App settings public read"
ON public.app_settings FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins update app settings" ON public.app_settings;
CREATE POLICY "Admins update app settings"
ON public.app_settings FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Storage bucket for challenge submission media
INSERT INTO storage.buckets (id, name, public)
VALUES ('challenge-submissions', 'challenge-submissions', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Challenge submissions public read" ON storage.objects;
CREATE POLICY "Challenge submissions public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'challenge-submissions');

DROP POLICY IF EXISTS "Authed users upload own challenge submissions" ON storage.objects;
CREATE POLICY "Authed users upload own challenge submissions"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'challenge-submissions'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
