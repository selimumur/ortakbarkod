ALTER TABLE public.spare_parts 
ADD COLUMN IF NOT EXISTS cargo_tracking_number TEXT,
ADD COLUMN IF NOT EXISTS cargo_provider_name TEXT DEFAULT 'Surat';

-- Refresh schema cache if needed
NOTIFY pgrst, 'reload schema';
