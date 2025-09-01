-- Manually trigger a scan of all wallet addresses to test the system
SELECT
  net.http_post(
      url:='https://lnokphjzmvdegutjpxhw.supabase.co/functions/v1/scan-wallet-transactions',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxub2twaGp6bXZkZWd1dGpweGh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODkwMTM3MSwiZXhwIjoyMDY0NDc3MzcxfQ.aLLdLwDqfzQFOi52LLBOCvQfDYY-8sXi2DT1zF8INPE"}'::jsonb,
      body:=json_build_object(
        'wallet_addresses', 
        ARRAY['0x249831b694ea3d2730c0d2e8dda0a8f38bb93aca', '0xb953dea9297178d13ead2e7be4694a9791b92c56', '0xbe5cfa2c4f2b62746a851e031167934da02fa8f2', '0x292b590ccece001ea59ca6085b83d1cecdea6819', '1e0f57be623c1a7322dbf2e406a72de468', '107667d4ff0a56ea2cc02d239282a309c5', '1adba654c3880114557861d45a0e2070f5', '181e647f42ee782eeea841993a1ce238ec'],
        'commercial_id', 
        '8e445ecf-e99a-4990-b578-d93dc1fb03c8'
      )::jsonb
  ) as request_id;