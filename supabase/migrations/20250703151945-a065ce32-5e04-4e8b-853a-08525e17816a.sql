
-- Drop existing restrictive policies on commercials table
DROP POLICY IF EXISTS "Commercials can view their own profile" ON public.commercials;
DROP POLICY IF EXISTS "Super admins and admins can manage commercials" ON public.commercials;

-- Create new permissive policies for public access
CREATE POLICY "Allow public access to select commercials" 
ON public.commercials FOR SELECT 
USING (true);

CREATE POLICY "Allow public access to insert commercials" 
ON public.commercials FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public access to update commercials" 
ON public.commercials FOR UPDATE 
USING (true);

CREATE POLICY "Allow public access to delete commercials" 
ON public.commercials FOR DELETE 
USING (true);
