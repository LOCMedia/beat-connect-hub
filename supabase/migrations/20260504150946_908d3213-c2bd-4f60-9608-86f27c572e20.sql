INSERT INTO storage.buckets (id, name, public)
VALUES ('competition-beats', 'competition-beats', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Competition beats publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'competition-beats');

CREATE POLICY "Admins upload competition beats"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'competition-beats' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update competition beats"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'competition-beats' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete competition beats"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'competition-beats' AND public.has_role(auth.uid(), 'admin'::app_role));