-- Ensure email_templates table has the exact structure needed
ALTER TABLE public.email_templates 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Ensure email_logs table has all required fields
ALTER TABLE public.email_logs 
ADD COLUMN IF NOT EXISTS tracking_id TEXT,
ADD COLUMN IF NOT EXISTS content TEXT;

-- Update email_logs tracking_id from existing tracking_code if needed
UPDATE public.email_logs 
SET tracking_id = tracking_code 
WHERE tracking_id IS NULL AND tracking_code IS NOT NULL;

-- Ensure server_config exists with current_server_ip
INSERT INTO public.server_config (current_server_ip) 
VALUES ('127.0.0.1'::inet)
ON CONFLICT DO NOTHING;