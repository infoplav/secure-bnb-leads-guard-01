-- Update the marketing_contacts table constraint to include all status values used in the marketing interface
ALTER TABLE public.marketing_contacts DROP CONSTRAINT IF EXISTS valid_status_check;

-- Add new constraint with all the status values from the marketing interface
ALTER TABLE public.marketing_contacts ADD CONSTRAINT valid_status_check 
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
  'do_not_call',
  'contacted',
  'closed'
));