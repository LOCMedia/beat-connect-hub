
-- Studio Tracks table
CREATE TABLE public.studio_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  audio_preview_url TEXT,
  full_track_url TEXT,
  stems_zip_url TEXT,
  cover_image_url TEXT,
  bpm INTEGER,
  key TEXT,
  genre TEXT,
  chorus_lyrics TEXT,
  artist_credit_suggestion TEXT DEFAULT 'Produced by LocBeatx | Additional vocals by [Artist]',
  suggested_split_producer INTEGER NOT NULL DEFAULT 30,
  price INTEGER NOT NULL DEFAULT 2900,
  is_published BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.studio_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Studio tracks publicly viewable"
  ON public.studio_tracks FOR SELECT
  USING (is_published = true OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage studio tracks"
  ON public.studio_tracks FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_studio_tracks_updated_at
  BEFORE UPDATE ON public.studio_tracks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Studio Track Purchases
CREATE TABLE public.studio_track_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL,
  buyer_email TEXT NOT NULL,
  buyer_user_id UUID,
  agreed_split_producer INTEGER NOT NULL,
  amount_paid INTEGER NOT NULL,
  payment_ref TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  download_token TEXT NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.studio_track_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view purchases"
  ON public.studio_track_purchases FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role records purchases"
  ON public.studio_track_purchases FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins update purchases"
  ON public.studio_track_purchases FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('studio-tracks-preview', 'studio-tracks-preview', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('studio-tracks-full', 'studio-tracks-full', false)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('studio-tracks-covers', 'studio-tracks-covers', true)
  ON CONFLICT (id) DO NOTHING;

-- Public preview + cover read
CREATE POLICY "Public read studio preview"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'studio-tracks-preview');

CREATE POLICY "Public read studio covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'studio-tracks-covers');

-- Admin upload all 3 buckets
CREATE POLICY "Admins upload studio preview"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'studio-tracks-preview' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update studio preview"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'studio-tracks-preview' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete studio preview"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'studio-tracks-preview' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins upload studio full"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'studio-tracks-full' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins read studio full"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'studio-tracks-full' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update studio full"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'studio-tracks-full' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete studio full"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'studio-tracks-full' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins upload studio covers"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'studio-tracks-covers' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update studio covers"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'studio-tracks-covers' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete studio covers"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'studio-tracks-covers' AND public.has_role(auth.uid(), 'admin'::app_role));
