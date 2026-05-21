
-- Producer-submitted beats for Beat Freestyle tournaments
CREATE TABLE public.tournament_producer_beats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL,
  user_id uuid NOT NULL,
  producer_name text NOT NULL,
  title text NOT NULL,
  genre text,
  bpm integer,
  key text,
  audio_url text NOT NULL,
  cover_image_url text,
  instagram text,
  status text NOT NULL DEFAULT 'approved', -- approved | removed (auto-approved per spec)
  is_winner boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tournament_producer_beats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved beats publicly viewable; owners/admin see all"
ON public.tournament_producer_beats FOR SELECT TO public
USING (status = 'approved' OR auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authed producers submit while open"
ON public.tournament_producer_beats FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_id
      AND t.category = 'beat_freestyle'
      AND t.status IN ('submissions_open','in_progress')
  )
);

CREATE POLICY "Owners edit own; admins edit all (beats)"
ON public.tournament_producer_beats FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = user_id);

CREATE POLICY "Admins delete beats"
ON public.tournament_producer_beats FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_tpb_updated
BEFORE UPDATE ON public.tournament_producer_beats
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_tpb_tournament ON public.tournament_producer_beats(tournament_id);

-- Link artist submissions to the beat they freestyled on (nullable for acapella)
ALTER TABLE public.tournament_artist_submissions
ADD COLUMN beat_id uuid;
