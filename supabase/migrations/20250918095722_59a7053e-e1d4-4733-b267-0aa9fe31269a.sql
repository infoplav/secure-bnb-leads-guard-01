-- Clean up wallets older than 48 hours
DO $$
DECLARE
  cutoff_time TIMESTAMP WITH TIME ZONE := NOW() - INTERVAL '48 hours';
  expired_wallet RECORD;
BEGIN
  -- First, clean up generated_wallets and related data
  FOR expired_wallet IN 
    SELECT id, eth_address, bsc_address, btc_address, wallet_id 
    FROM generated_wallets 
    WHERE created_at < cutoff_time
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
    
    -- If it has a wallet_id, also clean up the original wallet
    IF expired_wallet.wallet_id IS NOT NULL THEN
      DELETE FROM wallets 
      WHERE id = expired_wallet.wallet_id;
    END IF;
    
    RAISE NOTICE 'Deleted expired wallet: %', expired_wallet.id;
  END LOOP;
  
  -- Clean up any remaining old wallets that don't have generated_wallets entries
  DELETE FROM wallets 
  WHERE created_at < cutoff_time;
  
  RAISE NOTICE 'Cleanup completed for wallets older than 48 hours';
END $$;