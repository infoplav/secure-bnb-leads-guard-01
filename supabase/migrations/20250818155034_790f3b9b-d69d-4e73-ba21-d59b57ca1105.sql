-- Add transfer status to wallets table
ALTER TABLE public.wallets 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'available';

-- Update existing wallets to have proper status
UPDATE public.wallets 
SET status = CASE 
  WHEN is_used = true THEN 'used'
  ELSE 'available'
END
WHERE status IS NULL OR status = 'available';