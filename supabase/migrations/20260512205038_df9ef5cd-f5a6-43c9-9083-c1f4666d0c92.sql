CREATE TABLE public.user_lyrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  beat_id UUID REFERENCES public.beats(id) ON DELETE SET NULL,
  lyrics TEXT NOT NULL,
  mood TEXT,
  topic TEXT,
  keywords TEXT,
  length_bars INTEGER DEFAULT 8,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_lyrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own lyrics" ON public.user_lyrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own lyrics" ON public.user_lyrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own lyrics" ON public.user_lyrics
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins view all lyrics" ON public.user_lyrics
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX idx_user_lyrics_user ON public.user_lyrics(user_id, created_at DESC);