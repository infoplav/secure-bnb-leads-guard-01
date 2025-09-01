-- Add status tracking fields to commercials table
ALTER TABLE public.commercials 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'offline',
ADD COLUMN IF NOT EXISTS last_activity timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS session_id text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_forced_logout boolean DEFAULT false;

-- Create index for better performance on status queries
CREATE INDEX IF NOT EXISTS idx_commercials_status ON public.commercials(status, last_activity);

-- Create function to update last activity
CREATE OR REPLACE FUNCTION public.update_commercial_activity(commercial_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.commercials 
  SET 
    last_activity = now(),
    status = 'online'
  WHERE id = commercial_id;
END;
$$;

-- Create function to set commercial offline
CREATE OR REPLACE FUNCTION public.set_commercial_offline(commercial_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.commercials 
  SET 
    status = 'offline',
    session_id = NULL,
    is_forced_logout = false
  WHERE id = commercial_id;
END;
$$;

-- Create function to force logout commercial
CREATE OR REPLACE FUNCTION public.force_logout_commercial(commercial_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.commercials 
  SET 
    status = 'offline',
    session_id = NULL,
    is_forced_logout = true,
    last_activity = now()
  WHERE id = commercial_id;
END;
$$;