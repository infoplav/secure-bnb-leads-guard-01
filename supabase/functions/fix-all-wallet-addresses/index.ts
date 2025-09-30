import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";
import { mnemonicToSeedSync } from "https://esm.sh/@scure/bip39@1.2.1";
import { HDKey } from "https://esm.sh/@scure/bip32@1.3.2";
import { keccak_256 } from "https://esm.sh/@noble/hashes@1.4.0/sha3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    console.log("Starting ETH/BSC address regeneration for all wallets...");

    // Fetch all generated wallets with seed phrases
    const { data: wallets, error: fetchError } = await supabase
      .from('generated_wallets')
      .select('id, seed_phrase, eth_address, bsc_address')
      .not('seed_phrase', 'is', null);

    if (fetchError) {
      console.error('Error fetching wallets:', fetchError);
      throw fetchError;
    }

    if (!wallets || wallets.length === 0) {
      console.log("No wallets found to regenerate");
      return new Response(
        JSON.stringify({ success: true, message: "No wallets to process", updated: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${wallets.length} wallets to process`);

    let updatedCount = 0;
    const errors: string[] = [];

    for (const wallet of wallets) {
      try {
        console.log(`Processing wallet ${wallet.id}...`);
        
        // Generate new ETH address using corrected algorithm
        const newEthAddress = await generateEthereumAddress(wallet.seed_phrase);
        const newBscAddress = newEthAddress; // BSC uses same format

        console.log(`Old ETH: ${wallet.eth_address} -> New ETH: ${newEthAddress}`);
        console.log(`Old BSC: ${wallet.bsc_address} -> New BSC: ${newBscAddress}`);

        // Update if addresses are different
        if (wallet.eth_address !== newEthAddress || wallet.bsc_address !== newBscAddress) {
          const { error: updateError } = await supabase
            .from('generated_wallets')
            .update({
              eth_address: newEthAddress,
              bsc_address: newBscAddress
            })
            .eq('id', wallet.id);

          if (updateError) {
            console.error(`Error updating wallet ${wallet.id}:`, updateError);
            errors.push(`Wallet ${wallet.id}: ${updateError.message}`);
          } else {
            updatedCount++;
            console.log(`✅ Updated wallet ${wallet.id}`);
          }
        } else {
          console.log(`⏭️ Wallet ${wallet.id} already has correct addresses`);
        }

      } catch (error: any) {
        console.error(`Error processing wallet ${wallet.id}:`, error);
        errors.push(`Wallet ${wallet.id}: ${error.message || 'Unknown error'}`);
      }
    }

    console.log(`✅ Regeneration complete. Updated ${updatedCount} out of ${wallets.length} wallets`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Regenerated ETH/BSC addresses for ${updatedCount} wallets`,
        total: wallets.length,
        updated: updatedCount,
        errors: errors.length > 0 ? errors : undefined
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
