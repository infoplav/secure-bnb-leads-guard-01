
-- Remove the foreign key constraint on commercials.user_id
ALTER TABLE public.commercials DROP CONSTRAINT IF EXISTS commercials_user_id_fkey;

-- Make user_id nullable since we're not using auth
ALTER TABLE public.commercials ALTER COLUMN user_id DROP NOT NULL;
