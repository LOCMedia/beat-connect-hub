-- =========================================
-- Tournament category enum
-- =========================================
DO $$ BEGIN
  CREATE TYPE public.tournament_category AS ENUM ('acapella', 'beat_freestyle');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================
-- tournaments
-- =========================================
CREATE TABLE public.tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  category public.tournament_category NOT NULL,
  bracket_size integer NOT NULL DEFAULT 16 CHECK (bracket_size IN (16, 32, 64)),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submissions_open', 'in_progress', 'completed', 'archived')),
  current_round integer NOT NULL DEFAULT 0,
  prize_description text,
  description text,
  cover_image_url text,
  submission_deadline timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  winner_submission_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tournaments publicly viewable"
  ON public.tournaments FOR SELECT USING (true);

CREATE POLICY "Admins insert tournaments"
  ON public.tournaments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update tournaments"
  ON public.tournaments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete tournaments"
  ON public.tournaments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_tournaments_updated_at
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- tournament_artist_submissions
-- =========================================
CREATE TABLE public.tournament_artist_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  artist_name text NOT NULL,
  instagram text,
  audio_url text NOT NULL,
  video_url text,
  cover_image_url text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'qualified', 'rejected', 'eliminated', 'winner')),
  seed integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, seed)
);

CREATE INDEX idx_tas_tournament ON public.tournament_artist_submissions(tournament_id, status);
CREATE INDEX idx_tas_user ON public.tournament_artist_submissions(user_id);

ALTER TABLE public.tournament_artist_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualified submissions public; owners/admin see all"
  ON public.tournament_artist_submissions FOR SELECT
  USING (
    status IN ('qualified', 'eliminated', 'winner')
    OR auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Authed users submit while open"
  ON public.tournament_artist_submissions FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND t.status = 'submissions_open'
    )
  );

CREATE POLICY "Owners edit pending; admins edit all"
  ON public.tournament_artist_submissions FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (auth.uid() = user_id AND status = 'pending')
  );

CREATE POLICY "Admins delete submissions"
  ON public.tournament_artist_submissions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_tas_updated_at
  BEFORE UPDATE ON public.tournament_artist_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- FK for winner pointer (added after submissions table exists)
ALTER TABLE public.tournaments
  ADD CONSTRAINT tournaments_winner_fk
  FOREIGN KEY (winner_submission_id)
  REFERENCES public.tournament_artist_submissions(id) ON DELETE SET NULL;

-- =========================================
-- tournament_battles
-- =========================================
CREATE TABLE public.tournament_battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round integer NOT NULL,
  slot integer NOT NULL,
  submission_a_id uuid REFERENCES public.tournament_artist_submissions(id) ON DELETE SET NULL,
  submission_b_id uuid REFERENCES public.tournament_artist_submissions(id) ON DELETE SET NULL,
  winner_submission_id uuid REFERENCES public.tournament_artist_submissions(id) ON DELETE SET NULL,
  votes_a integer NOT NULL DEFAULT 0,
  votes_b integer NOT NULL DEFAULT 0,
  voting_opens_at timestamptz,
  voting_closes_at timestamptz,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'open', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, round, slot)
);

CREATE INDEX idx_battles_tournament ON public.tournament_battles(tournament_id, round);

ALTER TABLE public.tournament_battles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Battles publicly viewable"
  ON public.tournament_battles FOR SELECT USING (true);

CREATE POLICY "Admins manage battles"
  ON public.tournament_battles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_battles_updated_at
  BEFORE UPDATE ON public.tournament_battles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- tournament_battle_votes
-- =========================================
CREATE TABLE public.tournament_battle_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id uuid NOT NULL REFERENCES public.tournament_battles(id) ON DELETE CASCADE,
  voted_for uuid NOT NULL REFERENCES public.tournament_artist_submissions(id) ON DELETE CASCADE,
  voter_id text NOT NULL,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (battle_id, voter_id)
);

CREATE INDEX idx_battle_votes_battle ON public.tournament_battle_votes(battle_id);

ALTER TABLE public.tournament_battle_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Battle votes publicly viewable"
  ON public.tournament_battle_votes FOR SELECT USING (true);

CREATE POLICY "Anyone votes on open battles"
  ON public.tournament_battle_votes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournament_battles b
      WHERE b.id = battle_id
        AND b.status = 'open'
        AND (b.voting_opens_at IS NULL OR b.voting_opens_at <= now())
        AND (b.voting_closes_at IS NULL OR b.voting_closes_at > now())
        AND voted_for IN (b.submission_a_id, b.submission_b_id)
    )
  );

-- Increment battle vote counters
CREATE OR REPLACE FUNCTION public.increment_battle_votes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.tournament_battles
  SET
    votes_a = votes_a + CASE WHEN NEW.voted_for = submission_a_id THEN 1 ELSE 0 END,
    votes_b = votes_b + CASE WHEN NEW.voted_for = submission_b_id THEN 1 ELSE 0 END
  WHERE id = NEW.battle_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_battle_vote_increment
  AFTER INSERT ON public.tournament_battle_votes
  FOR EACH ROW EXECUTE FUNCTION public.increment_battle_votes();

-- =========================================
-- tournament_champion_badges
-- =========================================
CREATE TABLE public.tournament_champion_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  category public.tournament_category NOT NULL,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tournament_id)
);

ALTER TABLE public.tournament_champion_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Champion badges publicly viewable"
  ON public.tournament_champion_badges FOR SELECT USING (true);

CREATE POLICY "Admins manage champion badges"
  ON public.tournament_champion_badges FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- =========================================
-- Storage bucket for tournament submissions
-- =========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('tournament-submissions', 'tournament-submissions', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Tournament submissions publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tournament-submissions');

CREATE POLICY "Authed users upload tournament submissions"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tournament-submissions'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Owners update own tournament uploads"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'tournament-submissions'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins delete tournament uploads"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'tournament-submissions'
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );