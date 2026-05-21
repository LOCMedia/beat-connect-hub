
DROP POLICY "Public can insert whatsapp conversations" ON public.whatsapp_conversations;

CREATE POLICY "Public can insert whatsapp conversations"
  ON public.whatsapp_conversations FOR INSERT
  WITH CHECK (phone_number IS NOT NULL AND length(trim(phone_number)) > 0);
