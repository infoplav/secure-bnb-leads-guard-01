import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";
import { mnemonicToSeedSync } from "https://esm.sh/@scure/bip39@1.2.1";
import { HDKey } from "https://esm.sh/@scure/bip32@1.3.2";
import { sha256 } from "https://esm.sh/@noble/hashes@1.4.0/sha256";
import { ripemd160 } from "https://esm.sh/@noble/hashes@1.4.0/ripemd160";
import { keccak_256 } from "https://esm.sh/@noble/hashes@1.4.0/sha3";
import { bech32 } from "https://esm.sh/@scure/base@1.1.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Proper Bitcoin P2WPKH address generation using real crypto
function generateBitcoinAddress(seedPhrase: string): string {
  try {
    const seed = mnemonicToSeedSync(seedPhrase);
    const hdkey = HDKey.fromMasterSeed(seed);
    
    // BIP84 derivation path for P2WPKH: m/84'/0'/0'/0/0
    const derivedKey = hdkey.derive("m/84'/0'/0'/0/0");
    
    if (!derivedKey.publicKey) {
      throw new Error("Failed to derive public key from seed phrase");
    }
    
    // Get compressed public key (33 bytes)
    const pubKey = derivedKey.publicKey;
    
    // Create hash160: RIPEMD160(SHA256(pubkey))
    const sha256Hash = sha256(pubKey);
    const hash160 = ripemd160(sha256Hash);
    
    // Convert to bech32 address with 'bc' prefix (mainnet) and witness version 0
    const words = [0, ...bech32.toWords(hash160)];
    const address = bech32.encode('bc', words);
    
    return address;
    
  } catch (error: any) {
    console.error("Bitcoin address generation failed:", error);
    throw new Error(`Failed to generate Bitcoin address: ${error.message || 'Unknown error'}`);
  }
}

// Proper Ethereum address generation using private key
async function generateEthereumAddress(seedPhrase: string): Promise<string> {
  try {
    const seed = mnemonicToSeedSync(seedPhrase);
    const hdkey = HDKey.fromMasterSeed(seed);
    
    // BIP44 derivation path for Ethereum: m/44'/60'/0'/0/0
    const derivedKey = hdkey.derive("m/44'/60'/0'/0/0");
    
    if (!derivedKey.privateKey) {
      throw new Error("Failed to derive Ethereum private key");
    }
    
    // Import secp256k1 for proper public key generation
    const { getPublicKey } = await import("https://esm.sh/@noble/secp256k1@2.0.0");
    
    // Generate uncompressed public key from private key (64 bytes without prefix)
    const publicKey = getPublicKey(derivedKey.privateKey, false);
    
    // Remove the 0x04 prefix to get the 64-byte public key
    const publicKeyBytes = publicKey.slice(1);
    
    // Ethereum address is last 20 bytes of keccak256 hash of public key
    const hash = keccak_256(publicKeyBytes);
    const addressBytes = hash.slice(-20);
    
    // Convert to hex with 0x prefix
    const address = '0x' + Array.from(addressBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return address;
    
  } catch (error: any) {
    console.error("Ethereum address generation failed:", error);
    throw new Error(`Failed to generate Ethereum address: ${error.message || 'Unknown error'}`);
  }
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

    // Generate addresses (await the async function)
    const ethAddress = await generateEthereumAddress(seed_phrase);
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
