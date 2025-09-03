-- Remove restrictive admin-only policy that blocks public operations
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'marketing_contacts' AND policyname = 'Admins can manage all marketing_contacts'
  ) THEN
    DROP POLICY "Admins can manage all marketing_contacts" ON public.marketing_contacts;
  END IF;
END $$;

-- Ensure public can UPDATE marketing_contacts
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'marketing_contacts' AND policyname = 'Allow public access to update marketing_contacts'
  ) THEN
    DROP POLICY "Allow public access to update marketing_contacts" ON public.marketing_contacts;
  END IF;
END $$;

CREATE POLICY "Allow public access to update marketing_contacts"
ON public.marketing_contacts
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Ensure public can DELETE marketing_contacts (kept from previous migration, recreated defensively)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'marketing_contacts' AND policyname = 'Allow public access to delete marketing_contacts'
  ) THEN
    DROP POLICY "Allow public access to delete marketing_contacts" ON public.marketing_contacts;
  END IF;
END $$;

CREATE POLICY "Allow public access to delete marketing_contacts"
ON public.marketing_contacts
FOR DELETE
USING (true);