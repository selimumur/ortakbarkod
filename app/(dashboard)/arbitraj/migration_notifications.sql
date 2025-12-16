-- Add JSONB column for flexible notification settings
ALTER TABLE factory_settings 
ADD COLUMN IF NOT EXISTS notification_config jsonb DEFAULT '{}'::jsonb;

-- Example structure of notification_config:
-- {
--   "sound_enabled": true,
--   "sound_volume": 0.8,
--   "sound_file": "bell_1",
--   "email_daily_summary": true,
--   "email_recipients": ["admin@company.com"],
--   "alert_low_stock": true,
--   "alert_low_stock_threshold": 5,
--   "alert_new_order": true,
--   "alert_returns": true,
--   "marketplaces": {
--     "trendyol": { "questions": true, "orders": true },
--     "hepsiburada": { "questions": false }
--   }
-- }
