
-- 1. Sponsored challenges: drop the broad public read policy. Public-facing pages already query the sponsored_challenges_public view.
DROP POLICY IF EXISTS "Public reads safe columns of active/ended challenges" ON public.sponsored_challenges;

-- Make the public view run as definer (bypasses RLS) so anon/auth can read safe columns through the view.
ALTER VIEW public.sponsored_challenges_public SET (security_invoker = false);
GRANT SELECT ON public.sponsored_challenges_public TO anon, authenticated;

-- 2. Studio tracks: drop the public read policy that exposed full_track_url + stems_zip_url.
DROP POLICY IF EXISTS "Studio tracks publicly viewable" ON public.studio_tracks;

-- Public view excludes the paid asset URLs.
CREATE OR REPLACE VIEW public.studio_tracks_public AS
SELECT
  id, title, description, audio_preview_url, cover_image_url,
  bpm, key, genre, chorus_lyrics, artist_credit_suggestion,
  suggested_split_producer, price, is_published, display_order,
  created_at, updated_at
FROM public.studio_tracks
WHERE is_published = true;

ALTER VIEW public.studio_tracks_public SET (security_invoker = false);
GRANT SELECT ON public.studio_tracks_public TO anon, authenticated;

-- Admins can still read the full studio_tracks table via the existing "Admins manage studio tracks" ALL policy.

-- 3. Notification subscribers: remove direct insert from the client. The subscribe-newsletter edge function uses the service role.
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.notification_subscribers;
