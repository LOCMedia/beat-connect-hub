
-- Free beat lead capture
ALTER TABLE public.beat_download_requests
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS download_url text,
  ADD COLUMN IF NOT EXISTS download_expires_at timestamptz,
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN instagram_handle DROP NOT NULL;

-- Allow anonymous lead capture for free beats
DROP POLICY IF EXISTS "Users create own requests" ON public.beat_download_requests;
CREATE POLICY "Anyone can request free-beat download"
ON public.beat_download_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.beats b
    WHERE b.id = beat_id
      AND (b.is_free = true OR b.download_enabled = true)
  )
);

-- Sponsored competitions
ALTER TABLE public.contests
  ADD COLUMN IF NOT EXISTS is_sponsored boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sponsor_instagram text,
  ADD COLUMN IF NOT EXISTS sponsor_logo_url text,
  ADD COLUMN IF NOT EXISTS sponsor_message text,
  ADD COLUMN IF NOT EXISTS prize_amount text;

ALTER TABLE public.contest_entries
  ADD COLUMN IF NOT EXISTS sponsor_follow_confirmed boolean NOT NULL DEFAULT false;
