CREATE OR REPLACE FUNCTION public.get_admin_notification_subscribers()
RETURNS TABLE (
  id uuid,
  email text,
  email_verified boolean,
  is_active boolean,
  source text,
  subscribed_at timestamp with time zone,
  unsubscribed_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  preferences jsonb,
  phone_number text,
  whatsapp_opted_in boolean,
  form_location text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    ns.id,
    ns.email,
    ns.email_verified,
    ns.is_active,
    ns.source,
    ns.subscribed_at,
    ns.unsubscribed_at,
    ns.created_at,
    ns.updated_at,
    ns.preferences,
    ns.phone_number,
    ns.whatsapp_opted_in,
    ns.form_location
  FROM public.notification_subscribers ns
  ORDER BY ns.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_notification_subscribers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_notification_subscribers() TO authenticated;

DROP POLICY IF EXISTS "admin_select_all_subscribers" ON public.notification_subscribers;
CREATE POLICY "admin_select_all_subscribers"
ON public.notification_subscribers
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));