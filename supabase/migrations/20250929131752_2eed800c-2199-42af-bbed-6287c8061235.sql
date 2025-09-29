-- Add hide_contact_info field to commercials table
ALTER TABLE public.commercials 
ADD COLUMN hide_contact_info boolean DEFAULT false;