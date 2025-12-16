ALTER TABLE public.master_products 
ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb;
