-- Add default brand columns to factory_settings
ALTER TABLE factory_settings 
ADD COLUMN IF NOT EXISTS default_brand_id integer,
ADD COLUMN IF NOT EXISTS default_brand_name text;

-- If factory_settings table doesn't exist (just in case), create it (simplified)
CREATE TABLE IF NOT EXISTS factory_settings (
    id uuid default gen_random_uuid() primary key,
    overhead_percentage numeric default 15,
    profit_margin numeric default 30,
    default_brand_id integer,
    default_brand_name text
);

-- Ensure at least one row exists
INSERT INTO factory_settings (overhead_percentage, profit_margin)
SELECT 15, 30
WHERE NOT EXISTS (SELECT 1 FROM factory_settings);
