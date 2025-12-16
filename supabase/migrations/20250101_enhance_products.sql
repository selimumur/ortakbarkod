-- Add/Ensure columns for comprehensive Trendyol data
ALTER TABLE public.master_products 
ADD COLUMN IF NOT EXISTS raw_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS brand TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS shipment_days INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS vat_rate NUMERIC DEFAULT 0, -- KDV Oranı
ADD COLUMN IF NOT EXISTS description TEXT, -- Ensure exists
ADD COLUMN IF NOT EXISTS total_desi NUMERIC DEFAULT 0, -- Desi
ADD COLUMN IF NOT EXISTS market_price NUMERIC DEFAULT 0; -- Piyasa Satış Fiyatı (optional contrast to 'price')

-- Optional: Create an index on raw_data for advanced querying if needed later
-- CREATE INDEX IF NOT EXISTS idx_products_raw_data ON public.master_products USING gin (raw_data);
