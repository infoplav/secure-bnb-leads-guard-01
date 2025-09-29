-- Temporarily modify RLS policies for call_transcripts to allow access when CRM auth is active
-- Since this app uses localStorage auth instead of Supabase auth, we need to allow public access to call transcripts

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can manage call transcripts" ON public.call_transcripts;
DROP POLICY IF EXISTS "Commercials can view their own call transcripts" ON public.call_transcripts;

-- Create new policy that allows public access (since authentication is handled by localStorage)
CREATE POLICY "Allow public access to call transcripts" 
ON public.call_transcripts 
FOR ALL 
USING (true)
WITH CHECK (true);