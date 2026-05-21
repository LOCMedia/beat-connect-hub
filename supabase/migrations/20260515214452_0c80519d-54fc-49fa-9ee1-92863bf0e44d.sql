
-- Ensure pg_net is available for outbound HTTP from the trigger
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.trigger_chat_ai_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://swhfmffsawdlddqisnsq.supabase.co/functions/v1/chat-ai-reply',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'channel_id', NEW.channel_id,
      'sender_user_id', NEW.user_id,
      'message', NEW.message,
      'message_id', NEW.id
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block message inserts if the AI call fails
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_ai_reply_trigger ON public.chat_messages;
CREATE TRIGGER chat_ai_reply_trigger
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.trigger_chat_ai_reply();
