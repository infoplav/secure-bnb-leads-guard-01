-- Add telegram_id field to commercials table
ALTER TABLE public.commercials 
ADD COLUMN telegram_id text;