-- Update SIP credentials with new server configuration
UPDATE public.sip_credentials 
SET 
  extension = CASE 
    WHEN extension = '8203' THEN '6001'
    WHEN extension = '8204' THEN '6002'
    ELSE extension
  END,
  password = 'NUrkdRpMubIe7Xrr',
  display_name = CASE 
    WHEN extension = '8203' THEN 'Extension 6001'
    WHEN extension = '8204' THEN 'Extension 6002'
    ELSE display_name
  END,
  updated_at = now()
WHERE extension IN ('8203', '8204');

-- Update commercials table with new SIP server configuration
UPDATE public.commercials 
SET 
  sip_server = '13.38.136.149',
  sip_domain = '13.38.136.149',
  sip_port = 5060,
  updated_at = now();