
-- Per-beat license pricing (in cents/pence; store 0 to use defaults)
ALTER TABLE public.beats
  ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS license_mp3_price integer NOT NULL DEFAULT 2999,
  ADD COLUMN IF NOT EXISTS license_wav_price integer NOT NULL DEFAULT 4999,
  ADD COLUMN IF NOT EXISTS license_stems_price integer NOT NULL DEFAULT 9995,
  ADD COLUMN IF NOT EXISTS license_unlimited_price integer NOT NULL DEFAULT 14995,
  ADD COLUMN IF NOT EXISTS license_exclusive_price integer NOT NULL DEFAULT 59995;

-- Free-beat lead captures
CREATE TABLE IF NOT EXISTS public.beat_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beat_id uuid NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  instagram_handle text,
  agreed boolean NOT NULL DEFAULT false,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.beat_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create lead for free beat"
  ON public.beat_leads FOR INSERT
  WITH CHECK (
    agreed = true
    AND EXISTS (SELECT 1 FROM public.beats b WHERE b.id = beat_id AND b.is_free = true)
  );

CREATE POLICY "Admins read leads"
  ON public.beat_leads FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete leads"
  ON public.beat_leads FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_beat_leads_beat ON public.beat_leads(beat_id);
CREATE INDEX IF NOT EXISTS idx_beat_leads_created ON public.beat_leads(created_at DESC);
