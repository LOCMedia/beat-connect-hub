
ALTER TABLE public.notification_subscribers 
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS whatsapp_opted_in boolean NOT NULL DEFAULT false;
