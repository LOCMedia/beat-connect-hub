ALTER TABLE public.beats
  ADD COLUMN IF NOT EXISTS require_youtube_follow BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_instagram_follow BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS download_count INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_beat_download(_beat_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.beats SET download_count = download_count + 1 WHERE id = _beat_id;
$$;