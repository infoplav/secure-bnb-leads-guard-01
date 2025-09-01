-- Add password field to commercials table and set default password
ALTER TABLE public.commercials 
ADD COLUMN password text NOT NULL DEFAULT 'nathan149';

-- Update any existing records to have the new password
UPDATE public.commercials 
SET password = 'nathan149' 
WHERE password = 'nanah148' OR password IS NULL;