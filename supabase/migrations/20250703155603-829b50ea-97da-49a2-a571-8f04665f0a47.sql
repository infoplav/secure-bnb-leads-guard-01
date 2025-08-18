
-- Drop existing RLS policies for marketing_contacts
DROP POLICY IF EXISTS "Commercials can update their assigned marketing contacts" ON public.marketing_contacts;
DROP POLICY IF EXISTS "Commercials can view their assigned marketing contacts" ON public.marketing_contacts;
DROP POLICY IF EXISTS "Super admins and admins can manage all marketing contacts" ON public.marketing_contacts;

-- Create new public access policies for marketing_contacts
CREATE POLICY "Allow public access to select marketing_contacts" 
  ON public.marketing_contacts 
  FOR SELECT 
  USING (true);

CREATE POLICY "Allow public access to insert marketing_contacts" 
  ON public.marketing_contacts 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow public access to update marketing_contacts" 
  ON public.marketing_contacts 
  FOR UPDATE 
  USING (true);

CREATE POLICY "Allow public access to delete marketing_contacts" 
  ON public.marketing_contacts 
  FOR DELETE 
  USING (true);
