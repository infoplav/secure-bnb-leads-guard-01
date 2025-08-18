-- Add commercial_name column to user_leads table between ip_address and balance
ALTER TABLE public.user_leads 
ADD COLUMN commercial_name TEXT;