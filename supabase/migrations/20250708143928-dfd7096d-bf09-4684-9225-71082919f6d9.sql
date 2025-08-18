-- Add foreign key relationship between email_logs and commercials
ALTER TABLE public.email_logs 
ADD CONSTRAINT fk_email_logs_commercial_id 
FOREIGN KEY (commercial_id) REFERENCES public.commercials(id) ON DELETE SET NULL;