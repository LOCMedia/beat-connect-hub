
-- Contests
CREATE TABLE public.contests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  beat_id UUID REFERENCES public.beats(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  beat_download_url TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  prize_description TEXT,
  sponsor_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | active | voting | ended
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contests are publicly viewable"
  ON public.contests FOR SELECT USING (true);

CREATE POLICY "Admins can insert contests"
  ON public.contests FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update contests"
  ON public.contests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete contests"
  ON public.contests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_contests_updated
  BEFORE UPDATE ON public.contests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Contest entries
CREATE TABLE public.contest_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contest_id UUID NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  artist_name TEXT NOT NULL,
  instagram TEXT,
  freestyle_audio_url TEXT NOT NULL,
  video_url TEXT,
  votes INTEGER NOT NULL DEFAULT 0,
  bonus_votes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected | winner
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contest_id, user_id)
);

ALTER TABLE public.contest_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved entries publicly viewable"
  ON public.contest_entries FOR SELECT
  USING (status IN ('approved', 'winner') OR public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

CREATE POLICY "Logged-in users can submit entries"
  ON public.contest_entries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners or admins can update entries"
  ON public.contest_entries FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete entries"
  ON public.contest_entries FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_contest_entries_updated
  BEFORE UPDATE ON public.contest_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Votes
CREATE TABLE public.votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID NOT NULL REFERENCES public.contest_entries(id) ON DELETE CASCADE,
  user_id UUID,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX votes_entry_user_unique
  ON public.votes(entry_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX votes_entry_ip_unique
  ON public.votes(entry_id, ip_address) WHERE ip_address IS NOT NULL AND user_id IS NULL;

ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Votes are publicly viewable"
  ON public.votes FOR SELECT USING (true);

CREATE POLICY "Anyone can cast a vote"
  ON public.votes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contest_entries e
      WHERE e.id = votes.entry_id AND e.status IN ('approved', 'winner')
    )
  );

-- Increment vote counter on entries
CREATE OR REPLACE FUNCTION public.increment_entry_votes()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.contest_entries SET votes = votes + 1 WHERE id = NEW.entry_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_votes_increment
  AFTER INSERT ON public.votes
  FOR EACH ROW EXECUTE FUNCTION public.increment_entry_votes();

-- Auto-bonus when video_url provided
CREATE OR REPLACE FUNCTION public.set_video_bonus()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.video_url IS NOT NULL AND length(trim(NEW.video_url)) > 0 THEN
    NEW.bonus_votes := 50;
  ELSE
    NEW.bonus_votes := 0;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_entries_video_bonus
  BEFORE INSERT OR UPDATE OF video_url ON public.contest_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_video_bonus();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('competition-entries', 'competition-entries', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Competition entries publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'competition-entries');

CREATE POLICY "Authenticated users upload to their folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'competition-entries'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

CREATE POLICY "Admins manage competition entries storage"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'competition-entries' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'competition-entries' AND public.has_role(auth.uid(), 'admin'));
