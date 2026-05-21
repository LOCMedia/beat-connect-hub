-- 1) Remove the chat AI auto-reply trigger (edge function remains the single source)
DROP TRIGGER IF EXISTS chat_ai_reply_trigger ON public.chat_messages;
DROP TRIGGER IF EXISTS ai_auto_reply_trigger ON public.chat_messages;
DROP FUNCTION IF EXISTS public.trigger_chat_ai_reply();
DROP FUNCTION IF EXISTS public.ai_auto_reply();

-- 2) Seed maintenance_mode setting (idempotent)
INSERT INTO public.admin_settings (key, value, updated_at)
VALUES ('maintenance_mode', 'false', now())
ON CONFLICT (key) DO NOTHING;
