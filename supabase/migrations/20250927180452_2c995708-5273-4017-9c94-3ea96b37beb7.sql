-- Create transfer requests queue table
CREATE TABLE public.transfer_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  network TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  balance NUMERIC NOT NULL,
  amount_usd NUMERIC,
  commercial_id UUID REFERENCES public.commercials(id),
  generated_wallet_id UUID REFERENCES public.generated_wallets(id),
  status TEXT NOT NULL DEFAULT 'pending',
  telegram_message_id TEXT,
  transaction_hash TEXT,
  gas_used NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  executed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transfer settings table for network configuration
CREATE TABLE public.transfer_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  network TEXT UNIQUE NOT NULL,
  main_wallet_address TEXT NOT NULL,
  gas_limit BIGINT NOT NULL DEFAULT 21000,
  minimum_amount_usd NUMERIC NOT NULL DEFAULT 10.00,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.transfer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for transfer_requests
CREATE POLICY "Allow public access to manage transfer requests" 
ON public.transfer_requests 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create policies for transfer_settings
CREATE POLICY "Allow public access to manage transfer settings" 
ON public.transfer_settings 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at on transfer_requests
CREATE TRIGGER update_transfer_requests_updated_at
BEFORE UPDATE ON public.transfer_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on transfer_settings
CREATE TRIGGER update_transfer_settings_updated_at
BEFORE UPDATE ON public.transfer_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default transfer settings for common networks
INSERT INTO public.transfer_settings (network, main_wallet_address, gas_limit, minimum_amount_usd, enabled) VALUES
('ETH', '0x0000000000000000000000000000000000000000', 21000, 10.00, false),
('BSC', '0x0000000000000000000000000000000000000000', 21000, 5.00, false),
('POLYGON', '0x0000000000000000000000000000000000000000', 21000, 5.00, false)
ON CONFLICT (network) DO NOTHING;