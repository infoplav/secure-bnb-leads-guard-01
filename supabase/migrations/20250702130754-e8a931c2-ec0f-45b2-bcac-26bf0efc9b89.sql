
-- Drop existing RLS policies for server_config
DROP POLICY IF EXISTS "Allow authenticated users to select server_config" ON server_config;
DROP POLICY IF EXISTS "Allow authenticated users to insert server_config" ON server_config;
DROP POLICY IF EXISTS "Allow authenticated users to update server_config" ON server_config;

-- Create new policies that allow public access to server_config
CREATE POLICY "Allow public access to select server_config" 
  ON server_config 
  FOR SELECT 
  USING (true);

CREATE POLICY "Allow public access to insert server_config" 
  ON server_config 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow public access to update server_config" 
  ON server_config 
  FOR UPDATE 
  USING (true);
