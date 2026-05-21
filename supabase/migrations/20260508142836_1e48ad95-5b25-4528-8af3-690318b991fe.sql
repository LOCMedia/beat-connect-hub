ALTER TABLE public.beats ADD COLUMN IF NOT EXISTS starter_plays integer NOT NULL DEFAULT 0;

-- Backfill existing rows with a random starter between 50 and 500
UPDATE public.beats
SET starter_plays = 50 + floor(random() * 451)::int
WHERE starter_plays = 0;

-- Trigger to assign random starter on insert if not provided
CREATE OR REPLACE FUNCTION public.assign_starter_plays()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.starter_plays IS NULL OR NEW.starter_plays = 0 THEN
    NEW.starter_plays := 50 + floor(random() * 451)::int;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_beats_starter_plays ON public.beats;
CREATE TRIGGER trg_beats_starter_plays
BEFORE INSERT ON public.beats
FOR EACH ROW
EXECUTE FUNCTION public.assign_starter_plays();