-- Fix OTP expiry to recommended threshold
UPDATE auth.config 
SET raw_config = jsonb_set(
  raw_config, 
  '{OTP_EXPIRY}', 
  '"3600"'
) WHERE TRUE;