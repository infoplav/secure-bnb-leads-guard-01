-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a cron job to scan wallet transactions every 5 minutes
SELECT cron.schedule(
  'scan-wallet-transactions-every-5min',
  '*/5 * * * *', -- every 5 minutes
  $$
  SELECT
    net.http_post(
        url:='https://lnokphjzmvdegutjpxhw.supabase.co/functions/v1/wallet-usage-processor',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxub2twaGp6bXZkZWd1dGpweGh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODkwMTM3MSwiZXhwIjoyMDY0NDc3MzcxfQ.m4VgK2TlFkGDSsKhUP-bqK4K8Fk4qhYpE8qxUY7vhJs"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Create another cron job to automatically scan all generated wallets every 5 minutes
SELECT cron.schedule(
  'auto-scan-all-wallets-every-5min',
  '*/5 * * * *', -- every 5 minutes
  $$
  SELECT
    net.http_post(
        url:='https://lnokphjzmvdegutjpxhw.supabase.co/functions/v1/scan-wallet-transactions',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxub2twaGp6bXZkZWd1dGpweGh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODkwMTM3MSwiZXhwIjoyMDY0NDc3MzcxfQ.m4VgK2TlFkGDSsKhUP-bqK4K8Fk4qhYpE8qxUY7vhJs"}'::jsonb,
        body:=json_build_object(
          'wallet_addresses', 
          (SELECT array_agg(DISTINCT addr) 
           FROM (
             SELECT bsc_address as addr FROM generated_wallets WHERE bsc_address IS NOT NULL
             UNION ALL
             SELECT eth_address as addr FROM generated_wallets WHERE eth_address IS NOT NULL  
             UNION ALL
             SELECT btc_address as addr FROM generated_wallets WHERE btc_address IS NOT NULL
           ) addresses),
          'commercial_id', 
          (SELECT id FROM commercials LIMIT 1)
        )::jsonb
    ) as request_id;
  $$
);