
-- Update the marketing_contacts table to ensure status field can handle all our status options
-- and set a proper default value
ALTER TABLE public.marketing_contacts 
ALTER COLUMN status SET DEFAULT 'new';

-- Update any existing contacts that have 'pending' status to 'new' status
UPDATE public.marketing_contacts 
SET status = 'new' 
WHERE status = 'pending' OR status IS NULL;

-- Add a check constraint to ensure only valid status values are allowed
ALTER TABLE public.marketing_contacts 
ADD CONSTRAINT valid_status_check 
CHECK (status IN (
  'new', 
  'not_answering_1', 
  'not_answering_2', 
  'not_answering_3', 
  'callback', 
  'wrong_number', 
  'interested', 
  'not_interested', 
  'converted', 
  'do_not_call'
));
