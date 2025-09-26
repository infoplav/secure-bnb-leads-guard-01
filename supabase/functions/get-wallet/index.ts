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

    const { commercial_id, client_tracking_id } = await req.json();

    if (!commercial_id) {
      throw new Error('Commercial ID is required');
    }

    // Use email as the wallet ID
    const walletId = client_tracking_id;

    console.log(`Getting new wallet for commercial ${commercial_id}, client ${walletId || 'unknown'} - never reusing wallets`);

    // Get an available wallet
    const { data: availableWallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('status', 'available')
      .limit(1)
      .single();

    if (walletError || !availableWallet) {
      console.error('No available wallets found:', walletError);
      throw new Error('No available wallets found');
    }

    // Mark wallet as used
    const { error: updateError } = await supabase
      .from('wallets')
      .update({
        status: 'used',
        used_by_commercial_id: commercial_id,
        used_at: new Date().toISOString(),
        client_tracking_id: walletId || null
      })
      .eq('id', availableWallet.id);

    if (updateError) {
      console.error('Error updating wallet:', updateError);
      throw updateError;
    }

    console.log(`Assigned wallet ${availableWallet.id} to commercial ${commercial_id}`);

    // Generate cryptocurrency addresses for this wallet
    try {
      console.log(`Generating addresses for wallet ${availableWallet.id}`);
      
      const { data: addressData, error: addressError } = await supabase.functions.invoke('generate-wallet-addresses', {
        body: {
          wallet_id: availableWallet.id,
          seed_phrase: availableWallet.wallet_phrase,
          commercial_id: commercial_id
        }
      });

      if (addressError) {
        console.error('Error generating addresses:', addressError);
        // Don't fail the whole operation if address generation fails
        // The wallet is still usable, addresses can be generated later
      } else if (addressData?.success) {
        console.log(`Successfully generated addresses for wallet ${availableWallet.id}`);
      }
    } catch (addressGenError) {
      console.error('Address generation failed:', addressGenError);
      // Continue without failing - addresses can be generated later
    }

    return new Response(JSON.stringify({ 
      success: true, 
      wallet: availableWallet.wallet_phrase,
      wallet_id: availableWallet.id,
      reused: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in get-wallet function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error?.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});