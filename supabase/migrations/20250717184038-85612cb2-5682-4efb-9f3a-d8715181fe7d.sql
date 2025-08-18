-- Add missing columns to sip_credentials table if they don't exist
ALTER TABLE public.sip_credentials 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available';

-- Insert default credentials if they don't exist
INSERT INTO public.sip_credentials (extension, password, display_name, status)
VALUES 
  ('8203', 'trips', 'Extension 8203', 'available'),
  ('8204', 'trips', 'Extension 8204', 'available')
ON CONFLICT (extension) DO UPDATE SET
  password = EXCLUDED.password,
  display_name = EXCLUDED.display_name,
  status = EXCLUDED.status,
  updated_at = now();

-- Ensure call_history table has proper structure
ALTER TABLE public.call_history 
ADD COLUMN IF NOT EXISTS call_id TEXT,
ADD COLUMN IF NOT EXISTS caller_extension TEXT;

-- Update call_state column to status if needed
UPDATE public.call_history SET call_state = 'completed' WHERE call_state = 'ended' AND call_state IS NOT NULL;

-- Create function to get available SIP extensions
CREATE OR REPLACE FUNCTION public.get_available_sip_extensions()
RETURNS TABLE(extension TEXT, display_name TEXT, status TEXT)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT sc.extension, sc.display_name, COALESCE(sc.status, 'available') as status
  FROM public.sip_credentials sc
  ORDER BY sc.extension;
$$;