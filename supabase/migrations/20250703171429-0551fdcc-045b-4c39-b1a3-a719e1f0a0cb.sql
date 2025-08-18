
-- Remove the foreign key constraint on user_id from marketing_contacts table
ALTER TABLE public.marketing_contacts 
DROP CONSTRAINT IF EXISTS marketing_contacts_user_id_fkey;

-- Make user_id nullable since we're using dummy values
ALTER TABLE public.marketing_contacts 
ALTER COLUMN user_id DROP NOT NULL;
