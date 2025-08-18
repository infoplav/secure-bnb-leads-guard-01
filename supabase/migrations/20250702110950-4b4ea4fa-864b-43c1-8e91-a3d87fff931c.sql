
-- Add balance column to user_leads table
ALTER TABLE user_leads ADD COLUMN balance DECIMAL(15,2) DEFAULT 0.00;

-- Create a table to store the current server IP setting
CREATE TABLE IF NOT EXISTS server_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  current_server_ip INET NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on server_config
ALTER TABLE server_config ENABLE ROW LEVEL SECURITY;

-- Create policies for server_config (allowing authenticated users to manage it)
CREATE POLICY "Allow authenticated users to select server_config" 
  ON server_config 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to insert server_config" 
  ON server_config 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update server_config" 
  ON server_config 
  FOR UPDATE 
  TO authenticated 
  USING (true);

-- Insert default server IP if table is empty
INSERT INTO server_config (current_server_ip) 
SELECT '127.0.0.1'::inet
WHERE NOT EXISTS (SELECT 1 FROM server_config);
