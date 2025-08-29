-- Add auto_include_wallet field to commercials table
ALTER TABLE public.commercials 
ADD COLUMN auto_include_wallet boolean DEFAULT false;