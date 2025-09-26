-- Fix the remaining wallet with incorrect Bitcoin address
UPDATE generated_wallets 
SET btc_address = 'bc1quy0j77s93uqg2r4x5lksur6fvsr7xxkh98cr4r'
WHERE id = '314defc8-db52-491e-9cb4-12a6216b1f92' 
AND btc_address = '1a9bf873303e008f8d18184b8c8d2a6cc8';

-- Clean up old incorrect address scan states
DELETE FROM address_scan_state 
WHERE address IN (
  '1a9bf873303e008f8d18184b8c8d2a6cc8',
  '0xef6c739690b9aa59ed1254cf1ccb9627b0a077e3'
) 
AND network = 'GLOBAL';

-- Ensure correct addresses are in scan state
INSERT INTO address_scan_state (address, network, last_seen_at, commercial_id)
VALUES 
  ('bc1quy0j77s93uqg2r4x5lksur6fvsr7xxkh98cr4r', 'GLOBAL', now(), null),
  ('0x02e9bf8e65b82cd111eed31d2cba538c638dd84e', 'GLOBAL', now(), null),
  ('0x13e4fcb588f6bcac439ca31c716bdc23cf2467cd', 'GLOBAL', now(), null)
ON CONFLICT (address, network) DO UPDATE SET
  last_seen_at = now();