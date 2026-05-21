
-- 1. LICENSES TABLE
CREATE TABLE public.licenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  description TEXT,
  is_exclusive BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Licenses are publicly viewable"
  ON public.licenses FOR SELECT USING (true);

CREATE POLICY "Admins can insert licenses"
  ON public.licenses FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update licenses"
  ON public.licenses FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete licenses"
  ON public.licenses FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.licenses (name, price, description, is_exclusive, sort_order) VALUES
  ('MP3 Lease', 2900, 'MP3 file, non-exclusive, unlimited streams', false, 1),
  ('WAV Lease', 5900, 'WAV + MP3, non-exclusive, higher quality', false, 2),
  ('Exclusive', 49900, 'Full ownership, beat removed from store', true, 3);

-- 2. PURCHASES TABLE
CREATE TABLE public.purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  beat_id UUID NOT NULL REFERENCES public.beats(id) ON DELETE CASCADE,
  license_id UUID NOT NULL REFERENCES public.licenses(id),
  buyer_email TEXT NOT NULL,
  amount_paid INTEGER NOT NULL,
  stripe_payment_intent_id TEXT,
  download_token TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  download_expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view purchases"
  ON public.purchases FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can create a purchase"
  ON public.purchases FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.beats WHERE beats.id = purchases.beat_id));

CREATE POLICY "Admins can update purchases"
  ON public.purchases FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. DOWNLOAD_LOGS TABLE
CREATE TABLE public.download_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT
);

ALTER TABLE public.download_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view download logs"
  ON public.download_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can record a download for a purchase"
  ON public.download_logs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.purchases WHERE purchases.id = download_logs.purchase_id));

-- 4. WHATSAPP_CONVERSATIONS TABLE
CREATE TABLE public.whatsapp_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  beat_id UUID REFERENCES public.beats(id) ON DELETE SET NULL,
  message_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  converted_to_sale BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view whatsapp conversations"
  ON public.whatsapp_conversations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update whatsapp conversations"
  ON public.whatsapp_conversations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can insert whatsapp conversations"
  ON public.whatsapp_conversations FOR INSERT
  WITH CHECK (true);

-- 5. ADD COLUMNS TO BEATS
ALTER TABLE public.beats
  ADD COLUMN mood TEXT,
  ADD COLUMN bpm_detected INTEGER,
  ADD COLUMN key_detected TEXT,
  ADD COLUMN genre_detected TEXT,
  ADD COLUMN analysis_confidence JSONB,
  ADD COLUMN analyzed_at TIMESTAMPTZ;

-- 6. INDEXES
CREATE INDEX idx_purchases_beat_id ON public.purchases(beat_id);
CREATE INDEX idx_purchases_download_token ON public.purchases(download_token);
CREATE INDEX idx_whatsapp_phone ON public.whatsapp_conversations(phone_number);
CREATE INDEX idx_whatsapp_status ON public.whatsapp_conversations(status);
CREATE INDEX idx_beats_mood ON public.beats(mood);
CREATE INDEX idx_beats_genre_detected ON public.beats(genre_detected);
