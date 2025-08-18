
-- Temporarily allow public access to email templates for testing
-- You can restrict this later when authentication is properly set up

DROP POLICY IF EXISTS "Admins can manage email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Commercials can view email templates" ON public.email_templates;

-- Allow public access to manage email templates (for development/testing)
CREATE POLICY "Allow public access to manage email templates" 
  ON public.email_templates 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);
