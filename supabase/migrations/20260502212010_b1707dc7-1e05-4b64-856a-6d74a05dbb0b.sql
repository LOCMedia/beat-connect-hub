-- Subscribers
CREATE TABLE public.notification_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  email_verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  verification_token TEXT NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  unsubscribe_token TEXT NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  preferences JSONB NOT NULL DEFAULT '{"competitions":true,"new_beats":true,"winners":true,"platform_news":true}'::jsonb,
  source TEXT NOT NULL DEFAULT 'unknown',
  is_active BOOLEAN NOT NULL DEFAULT true,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX notification_subscribers_verification_token_idx ON public.notification_subscribers(verification_token);
CREATE UNIQUE INDEX notification_subscribers_unsubscribe_token_idx ON public.notification_subscribers(unsubscribe_token);
CREATE INDEX notification_subscribers_active_idx ON public.notification_subscribers(is_active, email_verified);

ALTER TABLE public.notification_subscribers ENABLE ROW LEVEL SECURITY;

-- Anyone may subscribe (form is public, no login required)
CREATE POLICY "Anyone can subscribe" ON public.notification_subscribers
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL
    AND length(trim(email)) BETWEEN 3 AND 254
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND is_active = true
    AND email_verified = false
  );

-- Admins can do anything
CREATE POLICY "Admins manage subscribers" ON public.notification_subscribers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_notification_subscribers_updated_at
  BEFORE UPDATE ON public.notification_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Announcements
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  announcement_type TEXT NOT NULL DEFAULT 'platform' CHECK (announcement_type IN ('competition','winner','new_beat','platform')),
  target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all','competitions','new_beats','winners','platform_news')),
  cta_label TEXT,
  cta_url TEXT,
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','sent','cancelled')),
  recipients_count INTEGER NOT NULL DEFAULT 0,
  opens_count INTEGER NOT NULL DEFAULT 0,
  clicks_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX announcements_status_idx ON public.announcements(status, scheduled_for);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Public can view announcements that have been sent (for an in-app "what's new" feed)
CREATE POLICY "Sent announcements public" ON public.announcements
  FOR SELECT TO anon, authenticated
  USING (status = 'sent');

CREATE POLICY "Admins manage announcements" ON public.announcements
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notification log
CREATE TABLE public.notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES public.notification_subscribers(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed','skipped')),
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, subscriber_id)
);

CREATE INDEX notification_log_announcement_idx ON public.notification_log(announcement_id);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read notification log" ON public.notification_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage notification log" ON public.notification_log
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));