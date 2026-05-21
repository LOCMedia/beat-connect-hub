
-- 1) Realtime: scope topics; remove broad 'messages' topic
DROP POLICY IF EXISTS "Authenticated subscribe to own user channel" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated send to own user channel" ON realtime.messages;

CREATE POLICY "Authenticated subscribe to own user channel"
ON realtime.messages
FOR SELECT TO authenticated
USING (
  realtime.topic() = 'user-notifications:' || auth.uid()::text
  OR realtime.topic() LIKE 'battle-comments:%'
  OR realtime.topic() = 'user-chat:' || auth.uid()::text
  OR (
    realtime.topic() LIKE 'chat:%'
    AND public.is_chat_participant(
      substring(realtime.topic() from 6)::uuid,
      auth.uid()
    )
  )
);

CREATE POLICY "Authenticated send to own user channel"
ON realtime.messages
FOR INSERT TO authenticated
WITH CHECK (
  realtime.topic() = 'user-notifications:' || auth.uid()::text
  OR realtime.topic() LIKE 'battle-comments:%'
  OR realtime.topic() = 'user-chat:' || auth.uid()::text
  OR (
    realtime.topic() LIKE 'chat:%'
    AND public.is_chat_participant(
      substring(realtime.topic() from 6)::uuid,
      auth.uid()
    )
  )
);

-- 2) Sponsored challenges: switch view to invoker rights, restrict base table access via column grants + RLS
DROP VIEW IF EXISTS public.sponsored_challenges_public;
CREATE VIEW public.sponsored_challenges_public
WITH (security_invoker = true) AS
SELECT id, sponsor_id, title, description, challenge_type, target_link,
       website_url, twitter_url, instagram_url, beat_upload_url,
       preview_audio_url, sponsor_logo_url, accent_color, sponsor_call_to_action,
       prize_amount, duration_days, start_date, end_date, status,
       created_at, updated_at
FROM public.sponsored_challenges
WHERE status = ANY (ARRAY['active'::text, 'ended'::text]);

GRANT SELECT ON public.sponsored_challenges_public TO anon, authenticated;

-- Revoke broad access on base table; grant column-level SELECT for safe fields only
REVOKE SELECT ON public.sponsored_challenges FROM anon, authenticated;
GRANT SELECT (
  id, sponsor_id, title, description, challenge_type, target_link,
  website_url, twitter_url, instagram_url, beat_upload_url,
  preview_audio_url, sponsor_logo_url, accent_color, sponsor_call_to_action,
  prize_amount, duration_days, start_date, end_date, status,
  created_at, updated_at
) ON public.sponsored_challenges TO anon, authenticated;
-- Owners/admins still need full access via authenticated role for their own rows
GRANT SELECT (commission_fee, commission_percent, stripe_payment_intent_id, rejection_reason)
  ON public.sponsored_challenges TO authenticated;

-- Add public RLS policy so the invoker view can read active/ended rows (column grants gate sensitive fields)
DROP POLICY IF EXISTS "Public reads safe columns of active/ended challenges" ON public.sponsored_challenges;
CREATE POLICY "Public reads safe columns of active/ended challenges"
ON public.sponsored_challenges
FOR SELECT TO anon, authenticated
USING (status = ANY (ARRAY['active'::text, 'ended'::text]));

-- 3) Beat reactions: drop duplicates, require voter_id for anon inserts
DROP POLICY IF EXISTS "anyone_insert_reactions" ON public.beat_reactions;
DROP POLICY IF EXISTS "public_insert_reactions" ON public.beat_reactions;
DROP POLICY IF EXISTS "anyone_read_reactions" ON public.beat_reactions;
DROP POLICY IF EXISTS "public_read_reactions" ON public.beat_reactions;
DROP POLICY IF EXISTS "auth_delete_own_reactions" ON public.beat_reactions;
DROP POLICY IF EXISTS "auth_delete_reactions" ON public.beat_reactions;

DROP POLICY IF EXISTS "Anon can react with voter id" ON public.beat_reactions;
CREATE POLICY "Anon can react with voter id"
ON public.beat_reactions
FOR INSERT TO anon
WITH CHECK (voter_id IS NOT NULL AND user_id IS NULL);

-- 4) Fix mutable search_path on trigger function
CREATE OR REPLACE FUNCTION public.notify_pipedream_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  perform net.http_post(
    url := 'https://eoy19ug202v459p.m.pipedream.net',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'message_id', NEW.id,
      'channel_id', NEW.channel_id,
      'user_id', NEW.user_id,
      'message', NEW.message,
      'created_at', NEW.created_at
    )
  );
  return NEW;
end;
$function$;
