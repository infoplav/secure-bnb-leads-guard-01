
-- Drop existing restrictive policies on sms_templates
DROP POLICY IF EXISTS "Admins can manage SMS templates" ON public.sms_templates;
DROP POLICY IF EXISTS "Commercials can view SMS templates" ON public.sms_templates;

-- Create new public access policy for all operations on sms_templates
CREATE POLICY "Allow public access to manage SMS templates" 
  ON public.sms_templates 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);
