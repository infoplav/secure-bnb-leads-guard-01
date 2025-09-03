-- Allow public access to delete marketing contacts
-- This updates the existing restrictive delete policy to allow public access
-- matching the pattern of other operations in this table

DROP POLICY IF EXISTS "Only admins can delete marketing_contacts" ON marketing_contacts;

CREATE POLICY "Allow public access to delete marketing_contacts" 
ON marketing_contacts 
FOR DELETE 
USING (true);