-- Add sponsor role to enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sponsor';

-- SPONSORS TABLE
CREATE TABLE public.sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  business_name text NOT NULL,
  email text NOT NULL,
  stripe_customer_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sponsors viewable by owner or admin" ON public.sponsors FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create their sponsor profile" ON public.sponsors FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners or admins update sponsor" ON public.sponsors FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete sponsor" ON public.sponsors FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER sponsors_updated_at BEFORE UPDATE ON public.sponsors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SPONSORED CHALLENGES
CREATE TABLE public.sponsored_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id uuid NOT NULL REFERENCES public.sponsors(id) ON DELETE CASCADE,
  challenge_type text NOT NULL CHECK (challenge_type IN ('follow','dance','freestyle')),
  target_link text NOT NULL,
  title text NOT NULL,
  description text,
  prize_amount integer NOT NULL DEFAULT 0,
  commission_fee integer NOT NULL DEFAULT 0,
  duration_days integer NOT NULL DEFAULT 7,
  start_date timestamptz,
  end_date timestamptz,
  status text NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment','pending_approval','active','ended','rejected')),
  stripe_payment_intent_id text,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sponsored_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active challenges public; owners/admin see all" ON public.sponsored_challenges FOR SELECT
  USING (
    status IN ('active','ended')
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.sponsors s WHERE s.id = sponsor_id AND s.user_id = auth.uid())
  );
CREATE POLICY "Sponsors create their challenges" ON public.sponsored_challenges FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.sponsors s WHERE s.id = sponsor_id AND s.user_id = auth.uid()));
CREATE POLICY "Sponsors or admin update" ON public.sponsored_challenges FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.sponsors s WHERE s.id = sponsor_id AND s.user_id = auth.uid())
  );
CREATE POLICY "Admins delete challenges" ON public.sponsored_challenges FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_sponsored_challenges_status ON public.sponsored_challenges(status);
CREATE INDEX idx_sponsored_challenges_sponsor ON public.sponsored_challenges(sponsor_id);
CREATE TRIGGER sponsored_challenges_updated_at BEFORE UPDATE ON public.sponsored_challenges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CHALLENGE SUBMISSIONS
CREATE TABLE public.challenge_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.sponsored_challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text,
  submission_url text,
  notes text,
  votes integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','winner')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved submissions public; owners/admin see all" ON public.challenge_submissions FOR SELECT
  USING (
    status IN ('approved','winner')
    OR auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Authed users create own submissions" ON public.challenge_submissions FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.sponsored_challenges c WHERE c.id = challenge_id AND c.status = 'active')
  );
CREATE POLICY "Owner or admin update submission" ON public.challenge_submissions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete submission" ON public.challenge_submissions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_challenge_submissions_challenge ON public.challenge_submissions(challenge_id);
CREATE TRIGGER challenge_submissions_updated_at BEFORE UPDATE ON public.challenge_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CHALLENGE VOTES
CREATE TABLE public.challenge_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.challenge_submissions(id) ON DELETE CASCADE,
  ip_address text NOT NULL,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, ip_address)
);
ALTER TABLE public.challenge_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Votes publicly viewable" ON public.challenge_votes FOR SELECT USING (true);
CREATE POLICY "Anyone can vote on approved submissions" ON public.challenge_votes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.challenge_submissions s
      WHERE s.id = submission_id AND s.status IN ('approved','winner')
    )
  );

-- Vote increment trigger
CREATE OR REPLACE FUNCTION public.increment_challenge_submission_votes()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.challenge_submissions SET votes = votes + 1 WHERE id = NEW.submission_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER challenge_votes_increment AFTER INSERT ON public.challenge_votes
  FOR EACH ROW EXECUTE FUNCTION public.increment_challenge_submission_votes();