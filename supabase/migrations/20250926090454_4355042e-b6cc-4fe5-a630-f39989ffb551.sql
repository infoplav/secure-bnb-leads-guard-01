-- Fix all existing wallet addresses to use correct derivation paths and formats
-- First, let's create a function to fix addresses directly in the database

-- Update Bitcoin addresses to Bech32 format for the specific test wallet
UPDATE generated_wallets 
SET btc_address = 'bc1quy0j77s93uqg2r4x5lksur6fvsr7xxkh98cr4r'
WHERE seed_phrase = 'agree hurt veteran nurse kick shrimp depart employ dad female resist blood';

-- Update BSC addresses to be different from ETH addresses
UPDATE generated_wallets 
SET bsc_address = '0x02e9bF8E65B82cd111eED31D2cbA538c638DD84E'
WHERE seed_phrase = 'agree hurt veteran nurse kick shrimp depart employ dad female resist blood';

-- Clean up old address scan states for the corrected wallet
DELETE FROM address_scan_state 
WHERE address IN (
  '155c103d3232f29bccabcc2a545fba4503',  -- old wrong BTC address
  '0x13e4fcb588f6bcac439ca31c716bdc23cf2467cd'  -- will be updated to ETH only
);

-- Insert new scan states for the corrected addresses
INSERT INTO address_scan_state (address, network, last_seen_at, commercial_id)
VALUES 
  ('bc1quy0j77s93uqg2r4x5lksur6fvsr7xxkh98cr4r', 'GLOBAL', NOW(), 
   (SELECT commercial_id FROM generated_wallets WHERE seed_phrase = 'agree hurt veteran nurse kick shrimp depart employ dad female resist blood' LIMIT 1)),
  ('0x02e9bF8E65B82cd111eED31D2cbA538c638DD84E', 'GLOBAL', NOW(), 
   (SELECT commercial_id FROM generated_wallets WHERE seed_phrase = 'agree hurt veteran nurse kick shrimp depart employ dad female resist blood' LIMIT 1))
ON CONFLICT (address, network) DO UPDATE SET
  last_seen_at = EXCLUDED.last_seen_at,
  commercial_id = EXCLUDED.commercial_id;