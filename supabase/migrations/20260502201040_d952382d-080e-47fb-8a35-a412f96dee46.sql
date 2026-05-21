
-- Remove the over-broad policy added in the previous migration
DROP POLICY IF EXISTS "Public can view active/ended challenge fields" ON public.sponsored_challenges;

-- Keep the public-safe view (already created) as the public read path.
-- Lock down direct table SELECT to anon/authenticated by revoking column access
-- on the sensitive columns, and granting only the safe columns.

REVOKE SELECT ON public.sponsored_challenges FROM anon, authenticated;

GRANT SELECT (
  id, sponsor_id, title, description, challenge_type, target_link,
  website_url, twitter_url, instagram_url, beat_upload_url,
  preview_audio_url, sponsor_logo_url, accent_color, sponsor_call_to_action,
  prize_amount, duration_days, start_date, end_date, status,
  created_at, updated_at
) ON public.sponsored_challenges TO anon, authenticated;

-- Sensitive financial columns: only owner sponsors and admins (via service role
-- or the owner/admin policy below) may read them. Add a policy that allows the
-- safe-column SELECT for active/ended rows.
CREATE POLICY "Public reads safe columns of active/ended challenges"
ON public.sponsored_challenges FOR SELECT
USING (status IN ('active', 'ended'));

-- Re-grant full SELECT to service_role for edge functions
GRANT SELECT ON public.sponsored_challenges TO service_role;
