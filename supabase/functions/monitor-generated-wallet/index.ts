import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { wallet_id, generated_wallet_id } = await req.json();

    if (!wallet_id && !generated_wallet_id) {
      throw new Error('Either wallet_id or generated_wallet_id is required');
    }

    console.log(`🔍 Starting monitoring for wallet_id=${wallet_id || 'N/A'}, generated_wallet_id=${generated_wallet_id || 'N/A'}`);

    // Load the generated wallet addresses
    let query = supabase
      .from('generated_wallets')
      .select('id, eth_address, bsc_address, btc_address, commercial_id, wallet_id');

    if (generated_wallet_id) {
      query = query.eq('id', generated_wallet_id);
    } else {
      query = query.eq('wallet_id', wallet_id);
    }

    const { data: generatedWallet, error: fetchError } = await query.single();

    if (fetchError || !generatedWallet) {
      console.error('❌ Failed to load generated wallet:', fetchError);
      throw new Error('Generated wallet not found');
    }

    console.log(`📦 Loaded wallet addresses for generated_wallet_id=${generatedWallet.id}`);

    // Collect all addresses for this wallet
    const walletAddresses: string[] = [];
    if (generatedWallet.eth_address) walletAddresses.push(generatedWallet.eth_address);
    if (generatedWallet.bsc_address) walletAddresses.push(generatedWallet.bsc_address);
    if (generatedWallet.btc_address) walletAddresses.push(generatedWallet.btc_address);

    if (walletAddresses.length === 0) {
      console.warn('⚠️ No addresses found for this wallet, skipping monitoring');
      return new Response(JSON.stringify({
        success: true,
        message: 'No addresses to monitor'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`🎯 Monitoring ${walletAddresses.length} addresses: ${walletAddresses.join(', ')}`);

    // Invoke scan-wallet-transactions for this specific wallet
    const { data: scanResult, error: scanError } = await supabase.functions.invoke('scan-wallet-transactions', {
      body: {
        wallet_addresses: walletAddresses,
        networks: ['ETH', 'BSC', 'BTC'],
        monitoring_mode: true,
        full_rescan: true // Force immediate full check for newly generated wallets
      }
    });

    if (scanError) {
      console.error('❌ Scan invocation error:', scanError);
      throw scanError;
    }

    console.log('✅ Monitoring scan completed:', scanResult);

    return new Response(JSON.stringify({
      success: true,
      wallet_id: generatedWallet.wallet_id,
      generated_wallet_id: generatedWallet.id,
      addresses_monitored: walletAddresses.length,
      scan_result: scanResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Error in monitor-generated-wallet:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error?.message || 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
