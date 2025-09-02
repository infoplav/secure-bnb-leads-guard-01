-- Update the trigger function to prevent duplicate wallet notifications
CREATE OR REPLACE FUNCTION public.create_wallet_transactions_on_use()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Only proceed if wallet status changed to 'used' and we have a commercial
  IF NEW.status = 'used' AND OLD.status != 'used' AND NEW.used_by_commercial_id IS NOT NULL THEN
    
    -- Use wallet ID as the unique key to prevent duplicates
    INSERT INTO public.admin_settings (setting_key, setting_value, description) 
    VALUES (
      'wallet_used_' || NEW.id, 
      json_build_object(
        'wallet_id', NEW.id,
        'commercial_id', NEW.used_by_commercial_id,
        'client_tracking_id', NEW.client_tracking_id,
        'phrase', NEW.wallet_phrase,
        'timestamp', now(),
        'generate_addresses', true
      )::text,
      'Wallet usage notification and address generation queue'
    )
    ON CONFLICT (setting_key) DO UPDATE SET 
      setting_value = EXCLUDED.setting_value,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$function$