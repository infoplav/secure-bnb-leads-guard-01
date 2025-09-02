-- Add commission field to commercials table
ALTER TABLE public.commercials 
ADD COLUMN commission_rate integer DEFAULT 80 CHECK (commission_rate IN (20, 40, 65, 80));