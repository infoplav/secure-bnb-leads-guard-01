-- Create email_logs table to track email sending activity
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tracking_code TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  contact_id UUID,
  user_id TEXT,
  template_id UUID,
  subject TEXT,
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  opened_at TIMESTAMP WITH TIME ZONE,
  open_count INTEGER DEFAULT 0,
  resend_id TEXT,
  commercial_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for email logs
CREATE POLICY "Allow public access to manage email logs" 
ON public.email_logs 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_email_logs_tracking_code ON public.email_logs(tracking_code);
CREATE INDEX IF NOT EXISTS idx_email_logs_commercial_id ON public.email_logs(commercial_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_contact_id ON public.email_logs(contact_id);