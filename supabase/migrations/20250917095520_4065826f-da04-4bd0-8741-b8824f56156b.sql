-- Test invoking the scan function directly
SELECT
  functions.invoke(
    'scan-wallet-transactions',
    json_build_object(
      'wallet_addresses', ARRAY['0xcf4a806a5f6bd9a39dd3ba1337b83f2a759d0999'],
      'networks', ARRAY['ETH', 'BSC'],
      'commercial_id', '13b8914a-72e3-4659-8ced-c863674b3230',
      'full_rescan', true
    )
  ) as result;