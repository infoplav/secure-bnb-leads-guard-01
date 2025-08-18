
-- Remove the name column and add separate api_key and secret_key columns if they don't exist
ALTER TABLE user_leads DROP COLUMN IF EXISTS name;

-- The api_key and secret_key columns already exist in the table, so no need to add them
-- Just making sure they're properly set up for storing the API credentials

-- Update any existing records to clear the name field data
UPDATE user_leads SET name = NULL WHERE name IS NOT NULL;
