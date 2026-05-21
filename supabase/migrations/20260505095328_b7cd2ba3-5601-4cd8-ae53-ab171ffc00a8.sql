ALTER TABLE public.contests
  ADD COLUMN IF NOT EXISTS beat_release_date timestamptz,
  ADD COLUMN IF NOT EXISTS beat_file_url text;