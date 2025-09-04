// Temporary script to trigger comprehensive wallet scanning
// This will be executed to trace all previous transactions

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lnokphjzmvdegutjpxhw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxub2twaGp6bXZkZWd1dGpweGh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5MDEzNzEsImV4cCI6MjA2NDQ3NzM3MX0.0YfR0lypCmnt2dZUKp4b2jk8n0EIs4R9RUq5NvOcu1w';

const supabase = createClient(supabaseUrl, supabaseKey);

async function scanAllWallets() {
  console.log('🔍 Starting comprehensive wallet transaction scan...');
  
  // All unique addresses from generated wallets
  const allAddresses = [
    // EVM addresses (BSC/ETH)
    '0xd9b7937650eb8a243e8bc5777db9ffe96474f240',
    '0x5f8c5d20935c4512b7b4d7bb320dd238abd5dc42', 
    '0xa4e98e2b7fc3225bde395bfdb7b46af91d95e740',
    '0x2953c9ea95e6db196dd970d0f93240005303be21',
    '0xeb1eef9cc27f0b9fc7072464e787771dd203aa43',
    '0x7ace38f21c47084007380e9349eb9268ad8a74e9',
    '0xb9540a5ab30c8edaba949d1c9cbbaedc00f16778',
    '0x3ed99b3567f270a6a1fa88f05271782df7806607',
    '0xb590d44a0efe1f66c77b01c20e5ada7b7014b418',
    '0xab9933d786bc3b82ad81ec937da11c068bf06069',
    '0x249831b694ea3d2730c0d2e8dda0a8f38bb93aca',
    
    // BTC addresses
    '12f063e12541c4576b290fc3b9020f1cae',
    '12f7d34358b8ca05d56195259887ddca1c',
    '128e57aa7b3664ac065a35892c5d3e67b7',
    '1bd07f44fae4aea55821752abc5b5190d9',
    '1dfae9f903b493aa6aca21d1faf6ef71eb',
    '1092301dd1e2ce592cd7bf238d48b24663',
    '1006851629208df14ad775147b3d8c4dfd',
    '1521fb39a7a222a5fe58735f63cf73b0ea',
    '1eb74ee50fbd86943f7cabf45802972923',
    '1aece10e117cfa25607f5e0bed5e426aab',
    '1e0f57be623c1a7322dbf2e406a72de468'
  ];

  try {
    const { data, error } = await supabase.functions.invoke('scan-wallet-transactions', {
      body: {
        wallet_addresses: allAddresses,
        commercial_id: 'b38d16a4-4fb0-4977-aa2e-c2b0d3191bc8' // Default commercial for comprehensive scan
      }
    });

    if (error) {
      console.error('❌ Scan error:', error);
      return;
    }

    console.log('✅ Comprehensive scan completed:', data);
    
  } catch (error) {
    console.error('❌ Failed to initiate scan:', error);
  }
}

scanAllWallets();