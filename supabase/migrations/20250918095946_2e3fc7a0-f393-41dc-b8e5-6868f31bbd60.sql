-- Fix cleanup to only delete wallets USED more than 48 hours ago
DO $$
DECLARE
  cutoff_time TIMESTAMP WITH TIME ZONE := NOW() - INTERVAL '48 hours';
  expired_wallet RECORD;
BEGIN
  -- Clean up generated_wallets where the associated wallet was used more than 48h ago
  FOR expired_wallet IN 
    SELECT gw.id, gw.eth_address, gw.bsc_address, gw.btc_address, gw.wallet_id 
    FROM generated_wallets gw
    LEFT JOIN wallets w ON gw.wallet_id = w.id
    WHERE (w.status = 'used' AND w.used_at < cutoff_time)
       OR (gw.wallet_id IS NULL AND gw.created_at < cutoff_time) -- seed-only wallets older than 48h
  LOOP
    -- Delete address scan states for this wallet
    DELETE FROM address_scan_state 
    WHERE address IN (expired_wallet.eth_address, expired_wallet.bsc_address, expired_wallet.btc_address);
    
    -- Delete wallet transactions for this wallet
    DELETE FROM wallet_transactions 
    WHERE generated_wallet_id = expired_wallet.id;
    
    -- Delete the generated wallet
    DELETE FROM generated_wallets 
    WHERE id = expired_wallet.id;
    
    -- If it has a wallet_id, mark the original wallet as available again
    IF expired_wallet.wallet_id IS NOT NULL THEN
      UPDATE wallets 
      SET status = 'available',
          used_by_commercial_id = NULL,
          used_at = NULL,
          client_tracking_id = NULL
      WHERE id = expired_wallet.wallet_id;
    END IF;
    
    RAISE NOTICE 'Cleaned up expired used wallet: %', expired_wallet.id;
  END LOOP;
  
  RAISE NOTICE 'Cleanup completed for wallets used more than 48 hours ago';
END $$;