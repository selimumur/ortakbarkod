-- Add columns for manual order support to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS manual_source TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS customer_address TEXT,
ADD COLUMN IF NOT EXISTS customer_city TEXT,
ADD COLUMN IF NOT EXISTS customer_district TEXT,
ADD COLUMN IF NOT EXISTS tax_number TEXT,
ADD COLUMN IF NOT EXISTS shipping_company_id BIGINT,
ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS manual_shipping_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_is_manual ON public.orders(is_manual);
CREATE INDEX IF NOT EXISTS idx_orders_manual_source ON public.orders(manual_source);
