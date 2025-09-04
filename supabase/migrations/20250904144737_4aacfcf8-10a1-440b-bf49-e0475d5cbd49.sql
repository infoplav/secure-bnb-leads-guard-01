-- Add cron job to process transaction notifications every 30 seconds
SELECT cron.schedule(
  'process-transaction-notifications',
  '*/30 * * * * *', 
  $$SELECT net.http_post(
      url:='https://lnokphjzmvdegutjpxhw.supabase.co/functions/v1/transaction-notification-processor',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
      body:='{}'::jsonb
  ) as request_id;$$
);