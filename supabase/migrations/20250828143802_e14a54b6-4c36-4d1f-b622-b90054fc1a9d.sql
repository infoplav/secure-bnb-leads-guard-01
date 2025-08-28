-- Function to create wallet transaction entries when a wallet is used
CREATE OR REPLACE FUNCTION public.create_wallet_transactions_on_use()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if wallet status changed to 'used' and we have a generated wallet
  IF NEW.status = 'used' AND OLD.status != 'used' AND NEW.used_by_commercial_id IS NOT NULL THEN
    -- Get the generated wallet info
    INSERT INTO public.wallet_transactions (
      wallet_id,
      generated_wallet_id,
      commercial_id,
      amount,
      network,
      transaction_type,
      to_address,
      processed_at,
      created_at
    )
    SELECT 
      NEW.id,
      gw.id,
      NEW.used_by_commercial_id,
      0.00, -- Initial amount is 0
      'BSC'::network_type,
      'deposit',
      gw.bsc_address,
      NOW(),
      NOW()
    FROM generated_wallets gw 
    WHERE gw.wallet_id = NEW.id;

    -- Create ETH entry
    INSERT INTO public.wallet_transactions (
      wallet_id,
      generated_wallet_id,
      commercial_id,
      amount,
      network,
      transaction_type,
      to_address,
      processed_at,
      created_at
    )
    SELECT 
      NEW.id,
      gw.id,
      NEW.used_by_commercial_id,
      0.00,
      'ETH'::network_type,
      'deposit',
      gw.eth_address,
      NOW(),
      NOW()
    FROM generated_wallets gw 
    WHERE gw.wallet_id = NEW.id;

    -- Create BTC entry
    INSERT INTO public.wallet_transactions (
      wallet_id,
      generated_wallet_id,
      commercial_id,
      amount,
      network,
      transaction_type,
      to_address,
      processed_at,
      created_at
    )
    SELECT 
      NEW.id,
      gw.id,
      NEW.used_by_commercial_id,
      0.00,
      'BTC'::network_type,
      'deposit',
      gw.btc_address,
      NOW(),
      NOW()
    FROM generated_wallets gw 
    WHERE gw.wallet_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on wallets table
DROP TRIGGER IF EXISTS wallet_used_trigger ON public.wallets;
CREATE TRIGGER wallet_used_trigger
  AFTER UPDATE ON public.wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.create_wallet_transactions_on_use();