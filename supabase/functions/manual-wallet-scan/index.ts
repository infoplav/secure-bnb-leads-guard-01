import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { wallet_addresses } = await req.json()
    
    if (!wallet_addresses || !Array.isArray(wallet_addresses)) {
      return new Response(
        JSON.stringify({ error: 'wallet_addresses array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔄 Manual scan for wallets:`, wallet_addresses)

    // Call the scan function with extended time range to catch the transaction
    const { data: scanResult, error: scanError } = await supabase.functions.invoke('scan-wallet-transactions', {
      body: {
        wallet_addresses: wallet_addresses,
        networks: ['ETH', 'BSC', 'BTC'],
        commercial_id: null,
        date_from: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // Last 48 hours
        date_to: new Date().toISOString(),
        force_rescan: true // Override cooldown
      }
    })

    if (scanError) {
      console.error('Error calling scan function:', scanError)
      return new Response(
        JSON.stringify({ error: 'Failed to scan wallets', details: scanError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Manual scan completed:', scanResult)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Manual wallet scan completed successfully',
        wallets_scanned: wallet_addresses,
        result: scanResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in manual-wallet-scan:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})