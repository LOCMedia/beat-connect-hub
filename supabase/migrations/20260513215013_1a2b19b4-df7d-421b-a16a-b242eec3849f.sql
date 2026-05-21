ALTER TABLE public.beats
  ADD COLUMN IF NOT EXISTS compare_at_price_pence INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';

CREATE INDEX IF NOT EXISTS idx_beats_price_pence ON public.beats(price_pence);