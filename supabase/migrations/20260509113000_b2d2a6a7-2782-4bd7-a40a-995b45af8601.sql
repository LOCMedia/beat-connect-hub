CREATE POLICY "Users can check own subscription"
ON public.notification_subscribers
FOR SELECT
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));