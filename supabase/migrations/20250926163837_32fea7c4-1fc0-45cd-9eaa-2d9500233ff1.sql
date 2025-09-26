-- Create trigger to automatically generate addresses when wallets are used
CREATE OR REPLACE FUNCTION public.trigger_address_generation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Only proceed if wallet status changed to 'used' and we have a commercial
  IF NEW.status = 'used' AND (OLD.status IS NULL OR OLD.status != 'used') AND NEW.used_by_commercial_id IS NOT NULL THEN
    
    -- Queue address generation task
    INSERT INTO public.admin_settings (setting_key, setting_value, description) 
    VALUES (
      'gen_addr_' || NEW.id, 
      json_build_object(
        'wallet_id', NEW.id,
        'commercial_id', NEW.used_by_commercial_id,
        'client_tracking_id', NEW.client_tracking_id,
        'seed_phrase', NEW.wallet_phrase,
        'timestamp', now(),
        'action', 'generate_addresses'
      )::text,
      'Address generation queue for wallet usage'
    )
    ON CONFLICT (setting_key) DO UPDATE SET 
      setting_value = EXCLUDED.setting_value,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger on wallets table
DROP TRIGGER IF EXISTS trigger_address_generation_on_wallet_use ON public.wallets;
CREATE TRIGGER trigger_address_generation_on_wallet_use
  AFTER UPDATE ON public.wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_address_generation();