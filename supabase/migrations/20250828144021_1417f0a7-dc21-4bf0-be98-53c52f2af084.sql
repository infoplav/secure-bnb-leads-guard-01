-- Fix function search path security warning
CREATE OR REPLACE FUNCTION public.create_wallet_transactions_on_use()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = ''
AS $$
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
      0.00,
      'BSC'::public.network_type,
      'deposit',
      gw.bsc_address,
      NOW(),
      NOW()
    FROM public.generated_wallets gw 
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
      'ETH'::public.network_type,
      'deposit',
      gw.eth_address,
      NOW(),
      NOW()
    FROM public.generated_wallets gw 
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
      'BTC'::public.network_type,
      'deposit',
      gw.btc_address,
      NOW(),
      NOW()
    FROM public.generated_wallets gw 
    WHERE gw.wallet_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;