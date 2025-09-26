import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { seed_phrase } = await req.json();
    
    if (!seed_phrase) {
      throw new Error('seed_phrase is required');
    }

    console.log(`🔍 DEBUG: Testing seed phrase: "${seed_phrase}"`);

    // Convert mnemonic to seed
    const seed = await mnemonicToSeed(seed_phrase);
    console.log(`🔍 DEBUG: Seed length: ${seed.length}`);
    
    // Create HD wallet
    const hdKey = HDKey.fromMasterSeed(seed);
    console.log(`🔍 DEBUG: Master key created successfully`);
    
    // Test different derivation paths
    const paths = {
      eth: "m/44'/60'/0'/0/0",   // Ethereum
      btc: "m/44'/0'/0'/0/0",    // Bitcoin
      bsc: "m/44'/60'/0'/0/0",   // BSC (same as ETH)
    };
    
    const results: any = {
      seed_phrase,
      addresses: {},
      debug_info: {}
    };

    for (const [network, path] of Object.entries(paths)) {
      try {
        console.log(`🔍 DEBUG: Deriving ${network.toUpperCase()} key with path: ${path}`);
        const derivedKey = hdKey.derive(path);
        
        if (!derivedKey.publicKey) {
          throw new Error(`Failed to derive ${network} key`);
        }

        console.log(`🔍 DEBUG: ${network.toUpperCase()} public key length: ${derivedKey.publicKey.length}`);
        console.log(`🔍 DEBUG: ${network.toUpperCase()} public key hex: ${Array.from(derivedKey.publicKey).map(b => b.toString(16).padStart(2, '0')).join('')}`);

        let address: string;
        if (network === 'btc') {
          address = generateBtcAddress(derivedKey.publicKey);
        } else {
          address = generateEthAddress(derivedKey.publicKey);
        }

        results.addresses[network] = address;
        results.debug_info[network] = {
          path,
          publicKey: Array.from(derivedKey.publicKey).map(b => b.toString(16).padStart(2, '0')).join(''),
          publicKeyLength: derivedKey.publicKey.length
        };

        console.log(`🔍 DEBUG: Generated ${network.toUpperCase()} address: ${address}`);
      } catch (error) {
        console.error(`🔍 DEBUG: Error deriving ${network}:`, error);
        results.addresses[network] = `ERROR: ${error.message}`;
      }
    }

    // Expected results for validation
    const expected = {
      btc: "bc1quy0j77s93uqg2r4x5lksur6fvsr7xxkh98cr4r",
      bsc: "0x02e9bF8E65B82cd111eED31D2cbA538c638DD84E"
    };

    results.validation = {
      btc_matches: results.addresses.btc === expected.btc,
      bsc_matches: results.addresses.bsc === expected.bsc,
      expected
    };

    console.log(`🔍 DEBUG: Validation results:`, results.validation);

    return new Response(JSON.stringify(results, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('🔍 DEBUG: Error in debug function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});