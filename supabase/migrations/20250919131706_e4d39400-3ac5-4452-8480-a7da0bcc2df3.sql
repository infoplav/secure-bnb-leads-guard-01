-- Add email configuration columns to commercials table
ALTER TABLE public.commercials 
ADD COLUMN email_domain_preference text DEFAULT 'domain1' CHECK (email_domain_preference IN ('domain1', 'domain2', 'alias')),
ADD COLUMN email_alias_from text DEFAULT 'do_not_reply@mailersp2.binance.com';