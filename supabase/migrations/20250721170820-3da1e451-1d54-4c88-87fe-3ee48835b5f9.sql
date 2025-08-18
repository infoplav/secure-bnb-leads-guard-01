-- Add SIP configuration columns to commercials table
ALTER TABLE public.commercials 
ADD COLUMN sip_server text,
ADD COLUMN sip_username text,
ADD COLUMN sip_password text,
ADD COLUMN sip_domain text,
ADD COLUMN sip_port integer DEFAULT 5060;