-- Add Printer Config to factory_settings
ALTER TABLE factory_settings 
ADD COLUMN IF NOT EXISTS printer_config jsonb DEFAULT '{
  "default_paper_size": "100x100",
  "default_format": "pdf",
  "show_logo": true,
  "show_order_number": true,
  "show_sku": true,
  "show_barcode": true,
  "custom_header": "",
  "custom_footer": ""
}'::jsonb;
