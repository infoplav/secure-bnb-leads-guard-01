-- Remove existing status constraint and add new one with correct values
ALTER TABLE public.marketing_contacts DROP CONSTRAINT IF EXISTS valid_status_check;

-- Add new constraint with the status values we're using
ALTER TABLE public.marketing_contacts ADD CONSTRAINT valid_status_check 
CHECK (status IN ('new', 'contacted', 'interested', 'not_interested', 'callback', 'converted', 'closed'));