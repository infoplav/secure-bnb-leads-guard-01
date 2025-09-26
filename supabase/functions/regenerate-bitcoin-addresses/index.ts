import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";
import { mnemonicToSeedSync } from "https://esm.sh/@scure/bip39@1.2.1";
import { HDKey } from "https://esm.sh/@scure/bip32@1.3.2";
import { sha256 } from "https://esm.sh/@noble/hashes@1.4.0/sha256";
import { ripemd160 } from "https://esm.sh/@noble/hashes@1.4.0/ripemd160";
import { bech32 } from "https://esm.sh/@scure/base@1.1.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Proper Bitcoin P2WPKH address generation using real crypto
function generateBitcoinAddress(seedPhrase: string): string {
  try {
    // Convert mnemonic to seed
    const seed = mnemonicToSeedSync(seedPhrase);
    
    // Create HD wallet from seed
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
    
    console.log(`Generated Bitcoin address: ${address} for seed phrase hash: ${seedPhrase.slice(0,10)}...`);
    return address;
    
  } catch (error: any) {
    console.error("Bitcoin address generation failed:", error);
    throw new Error(`Failed to generate Bitcoin address: ${error?.message || 'Unknown error'}`);
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

    console.log("Starting Bitcoin address regeneration...");

    // Get all generated wallets that need Bitcoin address regeneration
    const { data: wallets, error: fetchError } = await supabase
      .from('generated_wallets')
      .select('id, seed_phrase, btc_address')
      .not('seed_phrase', 'is', null);

    if (fetchError) {
      console.error('Error fetching wallets:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let processed = 0;
    let updated = 0;

    for (const wallet of wallets || []) {
      try {
        processed++;
        
        // Generate new Bitcoin address from seed phrase using PROPER cryptography
        const newBtcAddress = generateBitcoinAddress(wallet.seed_phrase);
        
        // Always update if address is different, invalid, or truncated
        if (wallet.btc_address !== newBtcAddress || 
            !wallet.btc_address?.startsWith('bc1') || 
            wallet.btc_address?.length < 40) {
          
          const { error: updateError } = await supabase
            .from('generated_wallets')
            .update({ btc_address: newBtcAddress })
            .eq('id', wallet.id);

          if (updateError) {
            console.error(`Error updating wallet ${wallet.id}:`, updateError);
          } else {
            updated++;
            console.log(`Updated wallet ${wallet.id}: ${wallet.btc_address} -> ${newBtcAddress}`);
          }
        }
        
        // Small delay to avoid overwhelming the database
        if (processed % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        console.error(`Error processing wallet ${wallet.id}:`, error);
      }
    }

    console.log(`Regeneration complete. Processed: ${processed}, Updated: ${updated}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Regenerated Bitcoin addresses for ${updated} wallets`,
        processed,
        updated
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