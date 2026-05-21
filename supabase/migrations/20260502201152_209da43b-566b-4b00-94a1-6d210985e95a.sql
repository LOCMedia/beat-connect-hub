
-- Enable RLS on realtime.messages (idempotent)
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

-- Drop prior policies if re-running
DROP POLICY IF EXISTS "Authenticated subscribe to own user channel" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated subscribe to public battle channels" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated send to own user channel" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated send to public battle channels" ON realtime.messages;

-- Per-user notification channel: only the matching user
CREATE POLICY "Authenticated subscribe to own user channel"
ON realtime.messages
FOR SELECT TO authenticated
USING (
  realtime.topic() = 'user-notifications:' || auth.uid()::text
  OR realtime.topic() LIKE 'battle-comments:%'
  OR realtime.topic() = 'messages'
);

CREATE POLICY "Authenticated send to own user channel"
ON realtime.messages
FOR INSERT TO authenticated
WITH CHECK (
  realtime.topic() = 'user-notifications:' || auth.uid()::text
  OR realtime.topic() LIKE 'battle-comments:%'
  OR realtime.topic() = 'messages'
);
