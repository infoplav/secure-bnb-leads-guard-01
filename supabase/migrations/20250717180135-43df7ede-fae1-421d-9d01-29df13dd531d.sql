-- Ensure SIP credentials table exists with proper structure
CREATE TABLE IF NOT EXISTS public.sip_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  extension TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  display_name TEXT,
  status TEXT DEFAULT 'available'
);

-- Enable RLS
ALTER TABLE public.sip_credentials ENABLE ROW LEVEL SECURITY;

-- Create policy for read access
CREATE POLICY "Allow public read access to SIP credentials" 
ON public.sip_credentials 
FOR SELECT 
USING (true);

-- Insert default credentials if they don't exist
INSERT INTO public.sip_credentials (extension, password, display_name, status)
VALUES 
  ('8203', 'trips', 'Extension 8203', 'available'),
  ('8204', 'trips', 'Extension 8204', 'available')
ON CONFLICT (extension) DO UPDATE SET
  password = EXCLUDED.password,
  display_name = EXCLUDED.display_name,
  updated_at = now();

-- Ensure call_history table has proper structure
ALTER TABLE public.call_history 
ADD COLUMN IF NOT EXISTS call_id TEXT,
ADD COLUMN IF NOT EXISTS caller_extension TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'initiated';

-- Create function to get available SIP extensions
CREATE OR REPLACE FUNCTION public.get_available_sip_extensions()
RETURNS TABLE(extension TEXT, display_name TEXT, status TEXT)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT sc.extension, sc.display_name, sc.status
  FROM public.sip_credentials sc
  ORDER BY sc.extension;
$$;