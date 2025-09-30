-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule automatic wallet scanning every 2 minutes
-- This will invoke the monitor-wallet-transfers function automatically
SELECT cron.schedule(
  'auto-scan-wallet-transactions',
  '*/2 * * * *', -- Every 2 minutes
  $$
  SELECT
    net.http_post(
        url:='https://ztggzsxyafpjqjsjihwh.supabase.co/functions/v1/monitor-wallet-transfers',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0Z2d6c3h5YWZwanFqc2ppaHdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3NzYyMTgsImV4cCI6MjA1MjM1MjIxOH0.dMhS9yqOmBZmTxR8UMaLCYIB72RW_KKz4DT8JM3X8ys"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Also schedule processing of scheduled scans every minute
SELECT cron.schedule(
  'process-scheduled-wallet-scans',
  '* * * * *', -- Every minute
  $$
  SELECT
    net.http_post(
        url:='https://ztggzsxyafpjqjsjihwh.supabase.co/functions/v1/process-scheduled-scans',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0Z2d6c3h5YWZwanFqc2ppaHdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3NzYyMTgsImV4cCI6MjA1MjM1MjIxOH0.dMhS9yqOmBZmTxR8UMaLCYIB72RW_KKz4DT8JM3X8ys"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);