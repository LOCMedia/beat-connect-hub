
-- Tables
CREATE TABLE IF NOT EXISTS public.chat_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  is_dm boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_participants (
  channel_id uuid NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message text NOT NULL CHECK (length(btrim(message)) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_created
  ON public.chat_messages (channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user
  ON public.chat_participants (user_id);

ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Helper: is user a participant (security definer to avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.is_chat_participant(_channel_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE channel_id = _channel_id AND user_id = _user_id
  )
$$;

-- Helper: find or create a DM channel between auth.uid() and another user
CREATE OR REPLACE FUNCTION public.get_or_create_dm_channel(_other_user uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _channel uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _other_user IS NULL OR _other_user = _me THEN
    RAISE EXCEPTION 'Invalid recipient';
  END IF;

  SELECT c.id INTO _channel
  FROM public.chat_channels c
  WHERE c.is_dm = true
    AND EXISTS (SELECT 1 FROM public.chat_participants p WHERE p.channel_id = c.id AND p.user_id = _me)
    AND EXISTS (SELECT 1 FROM public.chat_participants p WHERE p.channel_id = c.id AND p.user_id = _other_user)
    AND (SELECT count(*) FROM public.chat_participants p WHERE p.channel_id = c.id) = 2
  LIMIT 1;

  IF _channel IS NOT NULL THEN
    RETURN _channel;
  END IF;

  INSERT INTO public.chat_channels (is_dm, created_by) VALUES (true, _me) RETURNING id INTO _channel;
  INSERT INTO public.chat_participants (channel_id, user_id) VALUES (_channel, _me), (_channel, _other_user);
  RETURN _channel;
END;
$$;

-- RLS policies
CREATE POLICY "Participants view channel"
  ON public.chat_channels FOR SELECT TO authenticated
  USING (public.is_chat_participant(id, auth.uid()));

CREATE POLICY "Participants view participants"
  ON public.chat_participants FOR SELECT TO authenticated
  USING (public.is_chat_participant(channel_id, auth.uid()));

CREATE POLICY "Participants read messages"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (public.is_chat_participant(channel_id, auth.uid()));

CREATE POLICY "Participants send messages"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_chat_participant(channel_id, auth.uid()));

CREATE POLICY "Update own last_read"
  ON public.chat_participants FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins delete messages"
  ON public.chat_messages FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Realtime
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_participants REPLICA IDENTITY FULL;
