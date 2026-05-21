-- Fix 1: prevent multiple submissions per user per challenge
ALTER TABLE public.challenge_submissions
  ADD CONSTRAINT unique_user_per_challenge UNIQUE (challenge_id, user_id);

-- Fix 2,3,4,6: sponsor socials, branding, preview audio, CTA
ALTER TABLE public.sponsored_challenges
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS twitter_url TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS sponsor_call_to_action TEXT DEFAULT 'Visit Website',
  ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#a855f7',
  ADD COLUMN IF NOT EXISTS sponsor_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS preview_audio_url TEXT;

-- Fix 5: contestant submission metadata
ALTER TABLE public.challenge_submissions
  ADD COLUMN IF NOT EXISTS video_thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT;