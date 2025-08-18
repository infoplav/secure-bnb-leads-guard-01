
-- Create marketing_contacts table to store uploaded CSV data
CREATE TABLE public.marketing_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    first_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketing_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for marketing_contacts
CREATE POLICY "Users can manage their own marketing contacts" ON public.marketing_contacts
  FOR ALL USING (auth.uid() = user_id);

-- Update admin_settings with SMS configuration
INSERT INTO public.admin_settings (setting_key, setting_value, description)
VALUES 
  ('sms_username', 'CharFR', 'SMS API Username'),
  ('sms_password', 'Char9', 'SMS API Password'),
  ('sms_sender_id', 'bnb OTP', 'SMS Sender ID (alphanumeric)')
ON CONFLICT (setting_key) DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  updated_at = now();
