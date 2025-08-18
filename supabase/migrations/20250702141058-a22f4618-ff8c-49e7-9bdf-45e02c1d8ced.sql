
-- Add commercial_id to marketing_contacts table to link contacts to specific commercials
ALTER TABLE public.marketing_contacts 
ADD COLUMN commercial_id UUID REFERENCES public.commercials(id) ON DELETE SET NULL;

-- Update RLS policies for marketing_contacts to support role-based access
DROP POLICY IF EXISTS "Users can manage their own marketing contacts" ON public.marketing_contacts;

-- New RLS policies for marketing_contacts
CREATE POLICY "Super admins and admins can manage all marketing contacts" ON public.marketing_contacts
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Commercials can view their assigned marketing contacts" ON public.marketing_contacts
  FOR SELECT USING (
    public.has_role(auth.uid(), 'commercial') AND 
    EXISTS (
      SELECT 1 FROM public.commercials 
      WHERE commercials.id = marketing_contacts.commercial_id 
      AND commercials.user_id = auth.uid()
    )
  );

CREATE POLICY "Commercials can update their assigned marketing contacts" ON public.marketing_contacts
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'commercial') AND 
    EXISTS (
      SELECT 1 FROM public.commercials 
      WHERE commercials.id = marketing_contacts.commercial_id 
      AND commercials.user_id = auth.uid()
    )
  );
