-- Feature 1: cover image column
ALTER TABLE public.beats ADD COLUMN IF NOT EXISTS cover_image_url text;

-- Public bucket for cover images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('beat-images', 'beat-images', true, 5242880, ARRAY['image/webp','image/png','image/jpeg'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for beat-images
CREATE POLICY "Beat images are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'beat-images');

CREATE POLICY "Admins can upload beat images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'beat-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update beat images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'beat-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete beat images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'beat-images' AND public.has_role(auth.uid(), 'admin'));

-- Feature 3: analytics table
CREATE TABLE public.beat_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beat_id uuid NOT NULL REFERENCES public.beats(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('play','whatsapp_click','instagram_click','share')),
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_beat_analytics_beat_id ON public.beat_analytics(beat_id);
CREATE INDEX idx_beat_analytics_created_at ON public.beat_analytics(created_at);
CREATE INDEX idx_beat_analytics_action_type ON public.beat_analytics(action_type);

ALTER TABLE public.beat_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record analytics for an existing beat"
ON public.beat_analytics FOR INSERT
TO public
WITH CHECK (EXISTS (SELECT 1 FROM public.beats WHERE beats.id = beat_analytics.beat_id));

CREATE POLICY "Admins can view analytics"
ON public.beat_analytics FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));