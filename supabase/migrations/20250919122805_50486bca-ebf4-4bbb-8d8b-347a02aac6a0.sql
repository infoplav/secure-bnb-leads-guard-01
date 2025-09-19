-- Make btc_address nullable temporarily to fix invalid addresses
ALTER TABLE generated_wallets ALTER COLUMN btc_address DROP NOT NULL;

-- Update invalid Bitcoin addresses to NULL so we can regenerate them
UPDATE generated_wallets 
SET btc_address = NULL 
WHERE length(btc_address) < 26 OR length(btc_address) > 35 OR NOT (btc_address ~ '^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$');

-- Create a function to regenerate Bitcoin addresses for existing wallets
CREATE OR REPLACE FUNCTION regenerate_bitcoin_addresses()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Queue regeneration tasks for all wallets with NULL btc_address
  INSERT INTO admin_settings (setting_key, setting_value, description) 
  SELECT 
    'regen_btc_' || gw.id, 
    json_build_object(
      'generated_wallet_id', gw.id,
      'wallet_id', gw.wallet_id,
      'seed_phrase', gw.seed_phrase,
      'commercial_id', gw.commercial_id,
      'action', 'regenerate_btc_address'
    )::text,
    'Regenerate Bitcoin address for generated wallet'
  FROM generated_wallets gw
  WHERE gw.btc_address IS NULL
  ON CONFLICT (setting_key) DO NOTHING;
END;
$$;