-- Update existing Bitcoin addresses that are invalid
-- First, let's check how many invalid BTC addresses we have
UPDATE generated_wallets 
SET btc_address = NULL 
WHERE length(btc_address) < 26 OR length(btc_address) > 35 OR NOT (btc_address ~ '^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$');

-- Add a comment for tracking
INSERT INTO admin_settings (setting_key, setting_value, description) 
VALUES ('bitcoin_addresses_reset', now()::text, 'Reset invalid Bitcoin addresses for regeneration')
ON CONFLICT (setting_key) DO UPDATE SET 
  setting_value = now()::text, 
  updated_at = now();