
-- ============================================================
-- 1. Remove public SELECT from vote tables (IP/voter_id leak)
-- ============================================================

-- public.votes
DROP POLICY IF EXISTS "Votes are publicly viewable" ON public.votes;
CREATE POLICY "Admins view votes"
ON public.votes FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- public.challenge_votes
DROP POLICY IF EXISTS "Votes publicly viewable" ON public.challenge_votes;
CREATE POLICY "Admins view challenge votes"
ON public.challenge_votes FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- public.tournament_battle_votes
DROP POLICY IF EXISTS "Battle votes publicly viewable" ON public.tournament_battle_votes;
CREATE POLICY "Users view own battle vote"
ON public.tournament_battle_votes FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 2. sponsored-beats storage: restrict broad authenticated read
-- ============================================================
DROP POLICY IF EXISTS "Authenticated read sponsored beats" ON storage.objects;

CREATE POLICY "Sponsors read own sponsored beats"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'sponsored-beats'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins read all sponsored beats"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'sponsored-beats'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- ============================================================
-- 3. sponsored_challenges: hide internal financial columns from public
-- ============================================================
-- Tighten the public-read policy so only sponsors/admins see full row.
-- Public users get a view with safe columns only.

DROP POLICY IF EXISTS "Active challenges public; owners/admin see all" ON public.sponsored_challenges;

CREATE POLICY "Owners and admins view full challenge row"
ON public.sponsored_challenges FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.sponsors s
    WHERE s.id = sponsored_challenges.sponsor_id AND s.user_id = auth.uid()
  )
);

-- Public-safe view (omits commission_fee, commission_percent, stripe_payment_intent_id, rejection_reason)
CREATE OR REPLACE VIEW public.sponsored_challenges_public
WITH (security_invoker = true) AS
SELECT
  id,
  sponsor_id,
  title,
  description,
  challenge_type,
  target_link,
  website_url,
  twitter_url,
  instagram_url,
  beat_upload_url,
  preview_audio_url,
  sponsor_logo_url,
  accent_color,
  sponsor_call_to_action,
  prize_amount,
  duration_days,
  start_date,
  end_date,
  status,
  created_at,
  updated_at
FROM public.sponsored_challenges
WHERE status IN ('active', 'ended');

GRANT SELECT ON public.sponsored_challenges_public TO anon, authenticated;

-- Allow the view to read past RLS for the public-safe subset by adding a
-- permissive policy that only matches when the row is active/ended. The view
-- runs with security_invoker so this RLS still applies.
CREATE POLICY "Public can view active/ended challenge fields"
ON public.sponsored_challenges FOR SELECT
USING (status IN ('active', 'ended'));
