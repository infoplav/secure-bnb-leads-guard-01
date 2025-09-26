import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Testing wallet generation flow...");

    // Get a test wallet
    const { data: testWallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('status', 'available')
      .limit(1)
      .single();

    if (walletError || !testWallet) {
      return new Response(
        JSON.stringify({ success: false, error: "No available wallets for testing" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Testing with wallet ${testWallet.id}`);

    // Test address generation
    const { data: addressData, error: addressError } = await supabase.functions.invoke('generate-wallet-addresses', {
      body: {
        wallet_id: testWallet.id,
        seed_phrase: testWallet.wallet_phrase,
        commercial_id: '13b8914a-72e3-4659-8ced-c863674b3230' // Test commercial ID
      }
    });

    if (addressError) {
      console.error('Address generation failed:', addressError);
      return new Response(
        JSON.stringify({ success: false, error: addressError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log('Address generation result:', addressData);

    // Verify the generated addresses
    if (addressData?.success && addressData?.data) {
      const { eth_address, btc_address, bsc_address } = addressData.data;
      
      const isValidBtc = btc_address && btc_address.startsWith('bc1q') && btc_address.length >= 42;
      const isValidEth = eth_address && eth_address.startsWith('0x') && eth_address.length === 42;
      const isValidBsc = bsc_address && bsc_address.startsWith('0x') && bsc_address.length === 42;

      return new Response(
        JSON.stringify({
          success: true,
          message: "Wallet generation test completed",
          results: {
            wallet_id: testWallet.id,
            addresses: {
              eth: eth_address,
              btc: btc_address,
              bsc: bsc_address
            },
            validation: {
              btc_valid: isValidBtc,
              eth_valid: isValidEth, 
              bsc_valid: isValidBsc,
              all_valid: isValidBtc && isValidEth && isValidBsc
            }
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Address generation returned invalid data" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (e: any) {
    console.error('Test function error:', e);
    return new Response(
      JSON.stringify({ success: false, error: e?.message || "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});