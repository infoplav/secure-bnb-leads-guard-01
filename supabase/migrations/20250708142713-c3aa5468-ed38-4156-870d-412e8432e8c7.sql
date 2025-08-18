-- Add source column to marketing_contacts table
ALTER TABLE public.marketing_contacts 
ADD COLUMN source text;