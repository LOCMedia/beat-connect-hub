
-- Beat comments
CREATE TABLE public.beat_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  beat_id UUID NOT NULL REFERENCES public.beats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_beat_comments_beat ON public.beat_comments(beat_id, created_at DESC);
ALTER TABLE public.beat_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments" ON public.beat_comments FOR SELECT USING (true);
CREATE POLICY "Auth users can comment" ON public.beat_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners or admins can delete" ON public.beat_comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- Beat reactions (one row per user/beat/emoji)
CREATE TABLE public.beat_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  beat_id UUID NOT NULL REFERENCES public.beats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL CHECK (emoji IN ('🔥','❤️','🎧','💯','🙌')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (beat_id, user_id, emoji)
);
CREATE INDEX idx_beat_reactions_beat ON public.beat_reactions(beat_id);
ALTER TABLE public.beat_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reactions" ON public.beat_reactions FOR SELECT USING (true);
CREATE POLICY "Auth users can react" ON public.beat_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own reaction" ON public.beat_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);
