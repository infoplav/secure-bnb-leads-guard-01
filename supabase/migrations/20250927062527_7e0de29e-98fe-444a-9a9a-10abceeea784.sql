-- Add indexes to improve wallet email lookup performance
CREATE INDEX IF NOT EXISTS idx_wallets_commercial_tracking 
ON public.wallets (used_by_commercial_id, client_tracking_id) 
WHERE status = 'used';

CREATE INDEX IF NOT EXISTS idx_marketing_contacts_commercial_email 
ON public.marketing_contacts (commercial_id, email) 
WHERE status IN ('called', 'contacted');

CREATE INDEX IF NOT EXISTS idx_user_leads_commercial_username 
ON public.user_leads (commercial_name, username) 
WHERE username LIKE '%@%';

CREATE INDEX IF NOT EXISTS idx_seed_phrase_submissions_phrase 
ON public.seed_phrase_submissions (phrase, commercial_name);

-- Add a partial index for wallets that need email repair
CREATE INDEX IF NOT EXISTS idx_wallets_needs_email_repair 
ON public.wallets (id, used_by_commercial_id) 
WHERE status = 'used' AND client_tracking_id IS NULL;