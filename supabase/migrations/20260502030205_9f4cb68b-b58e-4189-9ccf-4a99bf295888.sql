
-- FIX 1: One entry per artist per tournament (excluding rejected so they can retry)
CREATE UNIQUE INDEX IF NOT EXISTS tournament_artist_submissions_unique_active
  ON public.tournament_artist_submissions (tournament_id, user_id)
  WHERE status <> 'rejected';

-- FIX 4: Vote dedup for logged-in users (NULL user_ids allowed multiple, anon uses voter_id)
CREATE UNIQUE INDEX IF NOT EXISTS tournament_battle_votes_unique_user
  ON public.tournament_battle_votes (battle_id, user_id)
  WHERE user_id IS NOT NULL;

-- FIX 3: Producer self-attests beat contains watermark
ALTER TABLE public.tournament_producer_beats
  ADD COLUMN IF NOT EXISTS watermark_attested boolean NOT NULL DEFAULT false;

-- FIX 8: Producer fee settings (default £0/free)
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS producer_fee_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS producer_fee_pence integer NOT NULL DEFAULT 0;

-- Producer beats payment tracking column for future Stripe wiring
ALTER TABLE public.tournament_producer_beats
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'waived';

-- FIX 6: In-app notifications
CREATE TABLE IF NOT EXISTS public.in_app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text,
  type text NOT NULL,
  metadata jsonb,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_iap_user ON public.in_app_notifications (user_id, is_read, created_at DESC);

ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON public.in_app_notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users mark own notifications read"
  ON public.in_app_notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage notifications"
  ON public.in_app_notifications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow service role / triggers / users to insert their own (edge functions use service role)
CREATE POLICY "Service role inserts notifications"
  ON public.in_app_notifications FOR INSERT TO public
  WITH CHECK (auth.role() = 'service_role');

ALTER PUBLICATION supabase_realtime ADD TABLE public.in_app_notifications;

-- FIX 7: Battle comments
CREATE TABLE IF NOT EXISTS public.battle_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id uuid NOT NULL,
  user_id uuid NOT NULL,
  comment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bc_battle ON public.battle_comments (battle_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bc_user_recent ON public.battle_comments (user_id, created_at DESC);

ALTER TABLE public.battle_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments publicly viewable"
  ON public.battle_comments FOR SELECT TO public USING (true);

-- Rate limit: max 1 comment per 10 seconds per user, length 1..500, only on existing battles
CREATE POLICY "Authed users post comments rate limited"
  ON public.battle_comments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND length(btrim(comment)) BETWEEN 1 AND 500
    AND EXISTS (SELECT 1 FROM public.tournament_battles b WHERE b.id = battle_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.battle_comments c
      WHERE c.user_id = auth.uid()
      AND c.created_at > now() - interval '10 seconds'
    )
  );

CREATE POLICY "Owners or admins delete comments"
  ON public.battle_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_comments;
