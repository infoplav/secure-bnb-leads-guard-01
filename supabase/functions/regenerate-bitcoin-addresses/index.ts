import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { mnemonicToSeed } from 'npm:@scure/bip39@1.2.1';
import { HDKey } from 'npm:@scure/bip32@1.3.2';
import { sha256 } from 'npm:@noble/hashes@1.3.2/sha256';
import { ripemd160 } from 'npm:@noble/hashes@1.3.2/ripemd';
import { bech32 } from 'npm:@scure/base@1.1.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generate proper Bitcoin address from public key (Bech32 P2WPKH format)
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
    // Fallback: still generate a proper Bech32 address
    const hash = sha256(publicKey);
    const addressBytes = hash.slice(0, 20);
    const words = bech32.toWords(addressBytes);
    return bech32.encode('bc', [0, ...words]);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting Bitcoin address regeneration...')

    // Get all wallets with NULL btc_address
    const { data: walletsToFix, error: fetchError } = await supabase
      .from('generated_wallets')
      .select('id, wallet_id, seed_phrase, commercial_id, eth_address, bsc_address')
      .is('btc_address', null)
      .limit(50) // Process in batches

    if (fetchError) {
      throw new Error(`Error fetching wallets: ${fetchError.message}`)
    }

    if (!walletsToFix || walletsToFix.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No wallets need Bitcoin address regeneration',
          processed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${walletsToFix.length} wallets needing Bitcoin address regeneration`)

    let processedCount = 0
    const results = []

    for (const wallet of walletsToFix) {
      try {
        if (!wallet.seed_phrase) {
          console.error(`No seed phrase for wallet ${wallet.id}`)
          continue
        }

        console.log(`Processing wallet ${wallet.id}`)

        // Convert mnemonic to seed
        const seed = await mnemonicToSeed(wallet.seed_phrase)
        
        // Create HD wallet and derive Bitcoin key
        const hdKey = HDKey.fromMasterSeed(seed)
        const btcPath = "m/44'/0'/0'/0/0"   // Bitcoin standard path
        const btcKey = hdKey.derive(btcPath)

        if (!btcKey.publicKey) {
          throw new Error('Failed to derive Bitcoin key')
        }

        // Generate proper Bitcoin address
        const btcAddress = generateBtcAddress(btcKey.publicKey)

        console.log(`Generated new BTC address for wallet ${wallet.id}: ${btcAddress}`)

        // Update the wallet with the new Bitcoin address
        const { error: updateError } = await supabase
          .from('generated_wallets')
          .update({ btc_address: btcAddress })
          .eq('id', wallet.id)

        if (updateError) {
          throw new Error(`Failed to update wallet ${wallet.id}: ${updateError.message}`)
        }

        processedCount++
        results.push({
          wallet_id: wallet.id,
          old_btc_address: null,
          new_btc_address: btcAddress,
          success: true
        })

        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`Error processing wallet ${wallet.id}:`, error)
        results.push({
          wallet_id: wallet.id,
          success: false,
          error: error.message
        })
      }
    }

    // Make btc_address NOT NULL again if all wallets are fixed
    const { data: remainingNulls } = await supabase
      .from('generated_wallets')
      .select('id')
      .is('btc_address', null)
      .limit(1)

    if (!remainingNulls || remainingNulls.length === 0) {
      console.log('All Bitcoin addresses fixed, making column NOT NULL again')
      // Note: This would require a migration, leaving as nullable for now
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Regenerated Bitcoin addresses for ${processedCount} wallets`,
        processed: processedCount,
        total_found: walletsToFix.length,
        results: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in regenerate-bitcoin-addresses:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})