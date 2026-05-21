-- Create portfolio_entries table
CREATE TABLE public.portfolio_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('produced', 'featured', 'project')),
  title TEXT NOT NULL,
  artist_name TEXT,
  credit_text TEXT,
  external_link TEXT,
  cover_image_url TEXT,
  release_date DATE,
  description TEXT,
  tracklist JSONB,
  featured BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolio_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Portfolio entries are publicly viewable"
  ON public.portfolio_entries FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert portfolio entries"
  ON public.portfolio_entries FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update portfolio entries"
  ON public.portfolio_entries FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete portfolio entries"
  ON public.portfolio_entries FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_portfolio_entries_updated_at
  BEFORE UPDATE ON public.portfolio_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed 3 example entries (one of each type)
INSERT INTO public.portfolio_entries (entry_type, title, artist_name, credit_text, external_link, description, featured, display_order)
VALUES
  ('produced', 'Example Produced Track', 'Example Artist', 'Produced by LocBeatx', 'https://open.spotify.com/', 'Replace with one of your produced records.', true, 0),
  ('featured', 'Example Featured Song', 'Example Main Artist', 'Co-producer', 'https://open.spotify.com/', 'Replace with a track you contributed to.', false, 1),
  ('project', 'Example EP', 'LocBeatx', NULL, 'https://open.spotify.com/', 'Replace with one of your full projects, EPs, or albums.', false, 2);
