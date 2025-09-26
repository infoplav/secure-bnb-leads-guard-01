import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';
import { mnemonicToSeed } from 'npm:@scure/bip39@1.2.1';
import { HDKey } from 'npm:@scure/bip32@1.3.2';
import { keccak_256 } from 'npm:@noble/hashes@1.3.2/sha3';
import { sha256 } from 'npm:@noble/hashes@1.3.2/sha256';
import { ripemd160 } from 'npm:@noble/hashes@1.3.2/ripemd';
import { bech32 } from 'npm:@scure/base@1.1.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate Ethereum address from public key
function generateEthAddress(publicKey: Uint8Array): string {
  // Remove the 0x04 prefix for uncompressed key
  const pubKeyWithoutPrefix = publicKey.slice(1);
  // Hash with keccak256
  const hash = keccak_256(pubKeyWithoutPrefix);
  // Take last 20 bytes and convert to hex with 0x prefix
  return '0x' + Array.from(hash.slice(-20))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Generate Bitcoin address from public key (Bech32 P2WPKH format)
function generateBtcAddress(publicKey: Uint8Array): string {
  try {
    // Compress the public key (33 bytes: 0x02 or 0x03 prefix + 32 bytes x-coordinate)
    const compressed = publicKey.length === 65 
      ? new Uint8Array([publicKey[64] % 2 === 0 ? 0x02 : 0x03, ...publicKey.slice(1, 33)])
      : publicKey;
    
    // Hash with SHA-256 then RIPEMD-160 to get pubkey hash
    const sha256Hash = sha256(compressed);
    const pubkeyHash = ripemd160(sha256Hash);
    
    // Convert to 5-bit words for Bech32 encoding
    const words = bech32.toWords(pubkeyHash);
    
    // Encode as Bech32 address with witness version 0
    return bech32.encode('bc', [0, ...words]);
  } catch (error) {
    console.error('Error generating BTC address:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔧 Starting complete wallet address regeneration...');

    // Get all generated wallets that need fixing
    const { data: walletsToFix, error: fetchError } = await supabase
      .from('generated_wallets')
      .select('id, seed_phrase, eth_address, btc_address, bsc_address')
      .limit(100); // Process in batches

    if (fetchError) {
      throw new Error(`Error fetching wallets: ${fetchError.message}`);
    }

    if (!walletsToFix || walletsToFix.length === 0) {
      return new Response(JSON.stringify({ 
        success: true,
        message: 'No wallets found to fix',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`🔧 Found ${walletsToFix.length} wallets to process`);

    let processedCount = 0;
    const results = [];

    for (const wallet of walletsToFix) {
      try {
        if (!wallet.seed_phrase) {
          console.error(`❌ No seed phrase for wallet ${wallet.id}`);
          continue;
        }

        console.log(`🔧 Processing wallet ${wallet.id}`);

        // Convert mnemonic to seed
        const seed = await mnemonicToSeed(wallet.seed_phrase);
        
        // Create HD wallet
        const hdKey = HDKey.fromMasterSeed(seed);
        
        // Derive addresses using correct derivation paths
        const ethPath = "m/44'/60'/0'/0/0";  // Ethereum standard path
        const btcPath = "m/44'/0'/0'/0/0";   // Bitcoin standard path
        const bscPath = "m/44'/60'/0'/0/0";  // BSC uses same path as Ethereum
        
        const ethKey = hdKey.derive(ethPath);
        const btcKey = hdKey.derive(btcPath);
        const bscKey = hdKey.derive(bscPath);

        if (!ethKey.publicKey || !btcKey.publicKey || !bscKey.publicKey) {
          throw new Error('Failed to derive keys');
        }

        // Generate addresses
        const ethAddress = generateEthAddress(ethKey.publicKey);
        const btcAddress = generateBtcAddress(btcKey.publicKey);
        const bscAddress = generateEthAddress(bscKey.publicKey); // BSC uses ETH format but different derivation

        console.log(`🔧 Generated new addresses for wallet ${wallet.id}:`);
        console.log(`   ETH: ${ethAddress} (was: ${wallet.eth_address})`);
        console.log(`   BTC: ${btcAddress} (was: ${wallet.btc_address})`);
        console.log(`   BSC: ${bscAddress} (was: ${wallet.bsc_address})`);

        // Update the wallet with the new addresses
        const { error: updateError } = await supabase
          .from('generated_wallets')
          .update({
            eth_address: ethAddress,
            btc_address: btcAddress,
            bsc_address: bscAddress
          })
          .eq('id', wallet.id);

        if (updateError) {
          throw new Error(`Failed to update wallet ${wallet.id}: ${updateError.message}`);
        }

        // Update scan states with new addresses
        try {
          // Remove old scan states
          await supabase
            .from('address_scan_state')
            .delete()
            .in('address', [wallet.eth_address, wallet.btc_address, wallet.bsc_address]);

          // Add new scan states for the corrected addresses
          await supabase
            .from('address_scan_state')
            .upsert([
              {
                address: ethAddress,
                network: 'GLOBAL',
                last_seen_at: new Date().toISOString(),
                commercial_id: null
              },
              {
                address: btcAddress,
                network: 'GLOBAL', 
                last_seen_at: new Date().toISOString(),
                commercial_id: null
              },
              {
                address: bscAddress,
                network: 'GLOBAL',
                last_seen_at: new Date().toISOString(),
                commercial_id: null
              }
            ], { onConflict: 'address,network' });
        } catch (scanError) {
          console.warn(`⚠️ Failed to update scan states for wallet ${wallet.id}:`, scanError);
        }

        processedCount++;
        results.push({
          wallet_id: wallet.id,
          seed_phrase: wallet.seed_phrase,
          old_addresses: {
            eth: wallet.eth_address,
            btc: wallet.btc_address,
            bsc: wallet.bsc_address
          },
          new_addresses: {
            eth: ethAddress,
            btc: btcAddress,
            bsc: bscAddress
          },
          success: true
        });

        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Error processing wallet ${wallet.id}:`, error);
        results.push({
          wallet_id: wallet.id,
          success: false,
          error: error.message
        });
      }
    }

    console.log(`✅ Completed wallet address regeneration. Processed: ${processedCount}/${walletsToFix.length}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Fixed addresses for ${processedCount} wallets`,
      processed: processedCount,
      total_found: walletsToFix.length,
      results: results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in fix-all-wallet-addresses:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});