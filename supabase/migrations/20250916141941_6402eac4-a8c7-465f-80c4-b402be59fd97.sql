-- Create table to track per-address incremental scanning state
CREATE TABLE IF NOT EXISTS public.address_scan_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL,
  network TEXT NOT NULL, -- 'ETH' | 'BSC' | 'BTC' | 'SOL'
  last_scanned_block BIGINT,         -- for ETH/BSC/BTC
  last_signature TEXT,               -- for SOL (cursor)
  last_seen_at TIMESTAMPTZ,
  generated_wallet_id UUID,
  commercial_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_address_network UNIQUE (address, network)
);

-- Enable Row Level Security
ALTER TABLE public.address_scan_state ENABLE ROW LEVEL SECURITY;

-- Open policies (aligning with existing project policies)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'address_scan_state'
  ) THEN
    CREATE POLICY "Allow public access to manage address scan state"
    ON public.address_scan_state
    FOR ALL
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- Trigger to auto-update updated_at
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_address_scan_state_updated_at'
  ) THEN
    CREATE TRIGGER update_address_scan_state_updated_at
    BEFORE UPDATE ON public.address_scan_state
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_address_scan_state_address ON public.address_scan_state (address);
CREATE INDEX IF NOT EXISTS idx_address_scan_state_network ON public.address_scan_state (network);
CREATE INDEX IF NOT EXISTS idx_address_scan_state_commercial ON public.address_scan_state (commercial_id);
