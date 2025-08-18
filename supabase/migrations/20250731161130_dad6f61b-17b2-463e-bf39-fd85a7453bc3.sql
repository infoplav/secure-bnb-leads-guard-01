-- Fix security warnings and set up app settings
ALTER FUNCTION public.has_role(_user_id uuid, _role app_role) SET search_path = '';
ALTER FUNCTION public.get_user_role(_user_id uuid) SET search_path = '';
ALTER FUNCTION public.get_available_sip_extensions() SET search_path = '';
ALTER FUNCTION public.trigger_auto_balance_check() SET search_path = '';
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';

-- Set up app settings for the trigger function
SELECT set_config('app.supabase_url', 'https://lnokphjzmvdegutjpxhw.supabase.co', false);
SELECT set_config('app.supabase_anon_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxub2twaGp6bXZkZWd1dGpweGh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5MDEzNzEsImV4cCI6MjA2NDQ3NzM3MX0.0YfR0lypCmnt2dZUKp4b2jk8n0EIs4R9RUq5NvOcu1w', false);

-- Enable the trigger
CREATE TRIGGER auto_balance_check_trigger
  AFTER INSERT OR UPDATE OF api_key, secret_key ON user_leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_balance_check();