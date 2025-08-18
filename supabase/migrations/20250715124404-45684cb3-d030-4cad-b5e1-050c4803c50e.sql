-- Add language column to commercials table
ALTER TABLE public.commercials 
ADD COLUMN language text NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'en', 'de', 'es'));