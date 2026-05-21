-- Remove public access to the base sponsored_challenges table (which exposes sensitive financial columns)
DROP POLICY IF EXISTS "Public reads safe columns of active/ended challenges" ON public.sponsored_challenges;

-- Switch the public view to SECURITY DEFINER (security_invoker=false) so it can be read by anon
-- without granting public RLS on the base table. The view already excludes commission_fee,
-- commission_percent, stripe_payment_intent_id, and rejection_reason.
ALTER VIEW public.sponsored_challenges_public SET (security_invoker = false);

-- Grant SELECT on the safe view to anon and authenticated
GRANT SELECT ON public.sponsored_challenges_public TO anon, authenticated;