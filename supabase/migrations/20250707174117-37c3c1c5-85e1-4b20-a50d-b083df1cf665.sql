-- Fix RLS policies for marketing_contacts to allow status updates
DROP POLICY IF EXISTS "Allow public access to update marketing_contacts" ON public.marketing_contacts;

CREATE POLICY "Allow public access to update marketing_contacts" 
ON public.marketing_contacts 
FOR UPDATE 
USING (true)
WITH CHECK (true);