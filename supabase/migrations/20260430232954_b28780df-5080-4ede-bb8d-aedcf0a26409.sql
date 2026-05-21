-- Drop the overly-permissive sponsor update policy
DROP POLICY IF EXISTS "Sponsors or admin update" ON public.sponsored_challenges;

-- Admins keep full update rights
CREATE POLICY "Admins update challenges"
ON public.sponsored_challenges
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Sponsors can only edit drafts (pending_payment) and cannot change status/commission/payment/sponsor
CREATE POLICY "Sponsors edit own drafts"
ON public.sponsored_challenges
FOR UPDATE
TO authenticated
USING (
  status = 'pending_payment'
  AND EXISTS (
    SELECT 1 FROM public.sponsors s
    WHERE s.id = sponsored_challenges.sponsor_id AND s.user_id = auth.uid()
  )
)
WITH CHECK (
  status = 'pending_payment'
  AND EXISTS (
    SELECT 1 FROM public.sponsors s
    WHERE s.id = sponsored_challenges.sponsor_id AND s.user_id = auth.uid()
  )
);

-- Trigger to lock down sensitive columns from sponsor edits
CREATE OR REPLACE FUNCTION public.protect_sponsored_challenge_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins can change anything
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Non-admins (sponsors) cannot change protected fields
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Sponsors cannot change status';
  END IF;
  IF NEW.commission_fee IS DISTINCT FROM OLD.commission_fee THEN
    RAISE EXCEPTION 'Sponsors cannot change commission_fee';
  END IF;
  IF NEW.commission_percent IS DISTINCT FROM OLD.commission_percent THEN
    RAISE EXCEPTION 'Sponsors cannot change commission_percent';
  END IF;
  IF NEW.prize_amount IS DISTINCT FROM OLD.prize_amount THEN
    RAISE EXCEPTION 'Sponsors cannot change prize_amount after creation';
  END IF;
  IF NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id THEN
    RAISE EXCEPTION 'Sponsors cannot change stripe_payment_intent_id';
  END IF;
  IF NEW.sponsor_id IS DISTINCT FROM OLD.sponsor_id THEN
    RAISE EXCEPTION 'Sponsors cannot change sponsor_id';
  END IF;
  IF NEW.start_date IS DISTINCT FROM OLD.start_date THEN
    RAISE EXCEPTION 'Sponsors cannot change start_date';
  END IF;
  IF NEW.end_date IS DISTINCT FROM OLD.end_date THEN
    RAISE EXCEPTION 'Sponsors cannot change end_date';
  END IF;
  IF NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
    RAISE EXCEPTION 'Sponsors cannot change rejection_reason';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_sponsored_challenge_columns_trg ON public.sponsored_challenges;
CREATE TRIGGER protect_sponsored_challenge_columns_trg
BEFORE UPDATE ON public.sponsored_challenges
FOR EACH ROW
EXECUTE FUNCTION public.protect_sponsored_challenge_columns();

-- Server-side function to submit a draft for review (replaces client-side stub payment)
CREATE OR REPLACE FUNCTION public.submit_challenge_for_review(_challenge_id uuid, _payment_ref text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_owner boolean;
  _current_status text;
BEGIN
  SELECT status INTO _current_status
  FROM public.sponsored_challenges
  WHERE id = _challenge_id;

  IF _current_status IS NULL THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;

  IF _current_status <> 'pending_payment' THEN
    RAISE EXCEPTION 'Challenge is not in pending_payment status';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.sponsored_challenges c
    JOIN public.sponsors s ON s.id = c.sponsor_id
    WHERE c.id = _challenge_id AND s.user_id = auth.uid()
  ) INTO _is_owner;

  IF NOT _is_owner AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.sponsored_challenges
  SET status = 'pending_approval',
      stripe_payment_intent_id = COALESCE(_payment_ref, 'stub_' || gen_random_uuid()::text),
      updated_at = now()
  WHERE id = _challenge_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_challenge_for_review(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_challenge_for_review(uuid, text) TO authenticated;