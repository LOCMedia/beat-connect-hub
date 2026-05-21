
ALTER TABLE public.beat_reactions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.beat_reactions ADD COLUMN IF NOT EXISTS voter_id text;
CREATE INDEX IF NOT EXISTS idx_beat_reactions_beat ON public.beat_reactions(beat_id);
CREATE INDEX IF NOT EXISTS idx_beat_reactions_voter ON public.beat_reactions(voter_id);
