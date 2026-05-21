INSERT INTO storage.buckets (id, name, public) VALUES ('portfolio-covers', 'portfolio-covers', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Portfolio covers publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'portfolio-covers');

CREATE POLICY "Admins upload portfolio covers"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'portfolio-covers' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update portfolio covers"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'portfolio-covers' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete portfolio covers"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'portfolio-covers' AND has_role(auth.uid(), 'admin'::app_role));