ALTER TABLE public.master_products 
ADD COLUMN IF NOT EXISTS product_url TEXT;
