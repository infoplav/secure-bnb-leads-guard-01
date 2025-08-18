-- Create table for SIP credentials
CREATE TABLE public.sip_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  extension TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for call history
CREATE TABLE public.call_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  commercial_id UUID,
  extension TEXT NOT NULL,
  target_number TEXT NOT NULL,
  call_state TEXT NOT NULL DEFAULT 'initiated',
  call_duration INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sip_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;

-- Create policies for SIP credentials
CREATE POLICY "Allow public access to SIP credentials" 
ON public.sip_credentials 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create policies for call history
CREATE POLICY "Allow public access to call history" 
ON public.call_history 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Insert default SIP credentials
INSERT INTO public.sip_credentials (extension, password, display_name) VALUES
('8203', 'trips', 'Extension 8203'),
('8204', 'trips', 'Extension 8204');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_sip_credentials_updated_at
BEFORE UPDATE ON public.sip_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_call_history_updated_at
BEFORE UPDATE ON public.call_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();