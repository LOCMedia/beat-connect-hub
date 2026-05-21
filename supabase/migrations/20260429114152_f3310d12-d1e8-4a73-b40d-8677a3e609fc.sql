
-- Restrict bucket listing to admins (individual file reads still work via public URL)
DROP POLICY IF EXISTS "Beat snippets are publicly readable" ON storage.objects;

CREATE POLICY "Admins can list beat snippets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'beat-snippets' AND public.has_role(auth.uid(), 'admin'));

-- Tighten lead inserts: beat must exist
DROP POLICY IF EXISTS "Anyone can create a lead" ON public.leads;

CREATE POLICY "Anyone can create a lead for an existing beat"
  ON public.leads FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.beats WHERE id = beat_id));
