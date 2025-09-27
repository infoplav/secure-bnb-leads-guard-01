import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting backfill of generated_wallets for used wallets...');

    // Find used wallets that don't have corresponding generated_wallets entries
    const { data: usedWallets, error: walletError } = await supabase
      .from('wallets')
      .select(`
        id,
        wallet_phrase,
        used_by_commercial_id,
        client_tracking_id,
        used_at
      `)
      .eq('status', 'used')
      .not('used_by_commercial_id', 'is', null);

    if (walletError) {
      throw new Error(`Failed to fetch used wallets: ${walletError.message}`);
    }

    if (!usedWallets?.length) {
      console.log('No used wallets found');
      return new Response(JSON.stringify({
        success: true,
        message: 'No used wallets found to backfill',
        processed: 0,
        generated: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Found ${usedWallets.length} used wallets`);

    // Check which ones already have generated_wallets entries
    const { data: existingGenerated, error: existingError } = await supabase
      .from('generated_wallets')
      .select('wallet_id')
      .in('wallet_id', usedWallets.map(w => w.id));

    if (existingError) {
      throw new Error(`Failed to check existing generated wallets: ${existingError.message}`);
    }

    const existingWalletIds = new Set(existingGenerated?.map(gw => gw.wallet_id) || []);
    const walletsNeedingGeneration = usedWallets.filter(w => !existingWalletIds.has(w.id));

    console.log(`${walletsNeedingGeneration.length} wallets need generated_wallets entries`);

    let generatedCount = 0;
    const errors: string[] = [];

    // Process each wallet that needs address generation
    for (const wallet of walletsNeedingGeneration) {
      try {
        console.log(`Generating addresses for wallet ${wallet.id}...`);
        
        const { data: addressData, error: addressError } = await supabase.functions.invoke('generate-wallet-addresses', {
          body: {
            wallet_id: wallet.id,
            seed_phrase: wallet.wallet_phrase,
            commercial_id: wallet.used_by_commercial_id
          }
        });

        if (addressError) {
          console.error(`Error generating addresses for wallet ${wallet.id}:`, addressError);
          errors.push(`Wallet ${wallet.id}: ${addressError.message}`);
        } else if (addressData?.success) {
          console.log(`Successfully generated addresses for wallet ${wallet.id}`);
          generatedCount++;
        } else {
          errors.push(`Wallet ${wallet.id}: Address generation returned unsuccessful result`);
        }

        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Failed to process wallet ${wallet.id}:`, error);
        errors.push(`Wallet ${wallet.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const result = {
      success: true,
      message: `Backfill completed. Processed ${walletsNeedingGeneration.length} wallets, generated ${generatedCount} entries.`,
      processed: walletsNeedingGeneration.length,
      generated: generatedCount,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log('Backfill result:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in backfill-generated-wallets function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error?.message || 'Unknown error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});