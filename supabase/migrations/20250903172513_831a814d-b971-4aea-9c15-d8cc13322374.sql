-- Enable real-time updates for email_logs table
ALTER TABLE public.email_logs REPLICA IDENTITY FULL;

-- Add email_logs to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_logs;