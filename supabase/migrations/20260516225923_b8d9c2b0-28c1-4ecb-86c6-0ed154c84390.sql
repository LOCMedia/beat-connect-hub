
-- 1. Convert SECURITY DEFINER views to security_invoker
ALTER VIEW public.studio_tracks_public SET (security_invoker = on);
ALTER VIEW public.sponsored_challenges_public SET (security_invoker = on);

-- 2. Revoke EXECUTE on internal/trigger SECURITY DEFINER functions from anon and authenticated.
--    These are used by triggers or internal RLS and should not be callable as RPC.
DO $$
DECLARE
  fn text;
  internal_fns text[] := ARRAY[
    'has_role(uuid, app_role)',
    'is_chat_participant(uuid, uuid)',
    'handle_new_user_profile()',
    'notify_pipedream_on_new_message()',
    'protect_sponsored_challenge_columns()',
    'delete_email(text, bigint)',
    'enqueue_email(text, jsonb)',
    'move_to_dlq(text, text, bigint, jsonb)',
    'read_email_batch(text, integer, integer)'
  ];
BEGIN
  FOREACH fn IN ARRAY internal_fns LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;

-- Keep RPC-callable functions, but lock anon out (only authenticated):
REVOKE EXECUTE ON FUNCTION public.get_or_create_dm_channel(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_play_count(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_beat_download(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_challenge_for_review(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_notification_subscribers() FROM PUBLIC, anon;

-- 3. Drop overly-broad SELECT policies on public storage buckets.
--    Public buckets serve files via /storage/v1/object/public/* which bypasses RLS,
--    so direct public URL access keeps working. This only prevents listing.
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Beat images are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Challenge submissions public read" ON storage.objects;
DROP POLICY IF EXISTS "Competition beats publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Competition entries publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Entry covers are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Portfolio covers publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Public read preview files" ON storage.objects;
DROP POLICY IF EXISTS "Public read studio covers" ON storage.objects;
DROP POLICY IF EXISTS "Public read studio preview" ON storage.objects;
DROP POLICY IF EXISTS "Tournament submissions publicly readable" ON storage.objects;
