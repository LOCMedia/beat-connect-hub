
ALTER TABLE public.notification_subscribers
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS form_location text;

-- Replace the public insert policy to allow immediate verification (single opt-in)
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.notification_subscribers;

CREATE POLICY "Anyone can subscribe"
ON public.notification_subscribers
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL
  AND length(btrim(email)) BETWEEN 3 AND 254
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND is_active = true
);
