
-- 1) Per-beat download toggle
ALTER TABLE public.beats
  ADD COLUMN IF NOT EXISTS download_enabled BOOLEAN NOT NULL DEFAULT false;

-- 2) Follow confirmation on competition + tournament entries
ALTER TABLE public.contest_entries
  ADD COLUMN IF NOT EXISTS confirmed_follow BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.tournament_artist_submissions
  ADD COLUMN IF NOT EXISTS confirmed_follow BOOLEAN NOT NULL DEFAULT false;

-- Replace insert policies to require confirmed_follow = true
DROP POLICY IF EXISTS "Logged-in users can submit entries" ON public.contest_entries;
CREATE POLICY "Logged-in users can submit entries"
  ON public.contest_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND confirmed_follow = true);

DROP POLICY IF EXISTS "Authed users submit while open" ON public.tournament_artist_submissions;
CREATE POLICY "Authed users submit while open"
  ON public.tournament_artist_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND confirmed_follow = true
    AND EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_artist_submissions.tournament_id
        AND t.status = 'submissions_open'
    )
  );

-- 3) Download request queue
CREATE TABLE public.beat_download_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  beat_id UUID NOT NULL REFERENCES public.beats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  instagram_handle TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','denied')),
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bdr_beat ON public.beat_download_requests(beat_id);
CREATE INDEX idx_bdr_user ON public.beat_download_requests(user_id, created_at DESC);
CREATE INDEX idx_bdr_status ON public.beat_download_requests(status, created_at DESC);

ALTER TABLE public.beat_download_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create own requests"
  ON public.beat_download_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.beats b WHERE b.id = beat_id AND b.download_enabled = true)
  );

CREATE POLICY "Users read own requests"
  ON public.beat_download_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update requests"
  ON public.beat_download_requests
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete requests"
  ON public.beat_download_requests
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_bdr_updated_at
  BEFORE UPDATE ON public.beat_download_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
