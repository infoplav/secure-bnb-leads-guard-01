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

    const { wallet_address } = await req.json()
    
    if (!wallet_address) {
      return new Response(
        JSON.stringify({ error: 'wallet_address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔄 Force rescanning wallet: ${wallet_address}`)

    // Reset the scan state for this address to force a rescan
    const { error: updateError } = await supabase
      .from('address_scan_state')
      .update({ 
        last_seen_at: new Date(Date.now() - 15 * 60 * 1000).toISOString() // 15 minutes ago
      })
      .eq('address', wallet_address)

    if (updateError) {
      console.error('Error updating scan state:', updateError)
    }

    // Call the scan function directly
    const { data: scanResult, error: scanError } = await supabase.functions.invoke('scan-wallet-transactions', {
      body: {
        wallet_addresses: [wallet_address],
        networks: ['ETH', 'BSC', 'BTC'],
        commercial_id: null,
        date_from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
        date_to: new Date().toISOString()
      }
    })

    if (scanError) {
      console.error('Error calling scan function:', scanError)
      return new Response(
        JSON.stringify({ error: 'Failed to scan wallet', details: scanError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Wallet rescan completed:', scanResult)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Wallet rescanned successfully',
        result: scanResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in force-wallet-rescan:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})