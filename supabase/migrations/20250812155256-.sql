-- Create a more permissive policy for marketing_contacts that allows anon users to see all leads
-- This will override the restrictive authenticated policies

DROP POLICY IF EXISTS "Allow CRM authenticated users to manage marketing_contacts" ON public.marketing_contacts;

CREATE POLICY "Allow all users to view marketing_contacts" 
ON public.marketing_contacts 
FOR SELECT 
USING (true);

CREATE POLICY "Allow all users to update marketing_contacts" 
ON public.marketing_contacts 
FOR UPDATE 
USING (true);

-- Keep the existing policies for admins and specific commercial access but make them less restrictive