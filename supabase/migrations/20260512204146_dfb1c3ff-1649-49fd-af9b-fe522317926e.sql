-- Add price to beats
ALTER TABLE public.beats ADD COLUMN IF NOT EXISTS price_pence integer NOT NULL DEFAULT 0;

-- Flash sales table
CREATE TABLE IF NOT EXISTS public.flash_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beat_id uuid NOT NULL REFERENCES public.beats(id) ON DELETE CASCADE,
  discount_percent integer NOT NULL CHECK (discount_percent BETWEEN 1 AND 90),
  original_price integer NOT NULL DEFAULT 0,
  sale_price integer NOT NULL DEFAULT 0,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flash_sales_beat ON public.flash_sales(beat_id);
CREATE INDEX IF NOT EXISTS idx_flash_sales_window ON public.flash_sales(active, start_time, end_time);

ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Flash sales publicly viewable"
  ON public.flash_sales FOR SELECT
  USING (true);

CREATE POLICY "Admins manage flash sales"
  ON public.flash_sales FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_flash_sales_updated_at
  BEFORE UPDATE ON public.flash_sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();