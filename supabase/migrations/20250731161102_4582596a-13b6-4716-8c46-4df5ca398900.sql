-- Create trigger to automatically check balance when user_leads are inserted or updated
CREATE OR REPLACE FUNCTION trigger_auto_balance_check()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if we have API credentials
  IF NEW.api_key IS NOT NULL AND NEW.secret_key IS NOT NULL THEN
    -- Call the auto-balance-trigger function
    PERFORM net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/auto-balance-trigger',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.supabase_anon_key') || '"}',
      body := '{"record": {"id": "' || NEW.id || '", "api_key": "' || NEW.api_key || '", "secret_key": "' || NEW.secret_key || '"}}'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on user_leads table
DROP TRIGGER IF EXISTS auto_balance_check_trigger ON user_leads;
CREATE TRIGGER auto_balance_check_trigger
  AFTER INSERT OR UPDATE OF api_key, secret_key ON user_leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_balance_check();