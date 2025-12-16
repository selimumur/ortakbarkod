ALTER TABLE public.master_products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
