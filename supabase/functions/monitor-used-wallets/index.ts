import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting monitoring for all used wallets...')

    // Get all used wallets that are still within 48-hour monitoring window
    const fortyEightHoursAgo = new Date(Date.now() - (48 * 60 * 60 * 1000))
    
    const { data: usedWallets, error: walletsError } = await supabase
      .from('wallets')
      .select(`
        id,
        status,
        used_at,
        used_by_commercial_id,
        client_tracking_id,
        generated_wallets!inner(*)
      `)
      .eq('status', 'used')
      .gte('used_at', fortyEightHoursAgo.toISOString())

    if (walletsError) {
      throw new Error(`Error fetching used wallets: ${walletsError.message}`)
    }

    if (!usedWallets || usedWallets.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No used wallets found within monitoring window',
          monitored_wallets: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${usedWallets.length} used wallets to monitor`)

    // Group wallet addresses by commercial for batch scanning
    const scanByCommercial = new Map<string, string[]>()
    
    for (const wallet of usedWallets) {
      const gw = wallet.generated_wallets[0] // Get first generated wallet record
      if (!gw) continue

      const commercialId = wallet.used_by_commercial_id || gw.commercial_id
      if (!commercialId) continue

      const addresses: string[] = []
      if (gw.eth_address) addresses.push(gw.eth_address)
      if (gw.bsc_address) addresses.push(gw.bsc_address)  
      if (gw.btc_address) addresses.push(gw.btc_address)

      if (addresses.length > 0) {
        const existing = scanByCommercial.get(commercialId) || []
        scanByCommercial.set(commercialId, [...existing, ...addresses])
      }
    }

    let totalScanned = 0
    let scanResults = []

    // Scan wallets by commercial with proper rate limiting
    for (const [commercialId, addresses] of scanByCommercial.entries()) {
      try {
        console.log(`Scanning ${addresses.length} addresses for commercial ${commercialId}`)
        
        // Call the scan-wallet-transactions function
        const { data: scanResult, error: scanError } = await supabase.functions.invoke('scan-wallet-transactions', {
          body: {
            wallet_addresses: addresses,
            commercial_id: commercialId,
            networks: ['ETH', 'BSC', 'BTC']
          }
        })

        if (scanError) {
          console.error(`Scan error for commercial ${commercialId}:`, scanError)
          scanResults.push({
            commercial_id: commercialId,
            addresses_count: addresses.length,
            success: false,
            error: scanError.message
          })
        } else {
          console.log(`Scan completed for commercial ${commercialId}:`, scanResult)
          scanResults.push({
            commercial_id: commercialId,
            addresses_count: addresses.length,
            success: true,
            result: scanResult
          })
          totalScanned += addresses.length
        }

        // Rate limiting - wait 3 seconds between commercial scans
        if (scanByCommercial.size > 1) {
          await new Promise(resolve => setTimeout(resolve, 3000))
        }

      } catch (error) {
        console.error(`Error scanning commercial ${commercialId}:`, error)
        scanResults.push({
          commercial_id: commercialId,
          addresses_count: addresses.length,
          success: false,
          error: (error as any)?.message
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Monitoring completed for ${totalScanned} wallet addresses across ${scanByCommercial.size} commercials`,
        stats: {
          used_wallets_found: usedWallets.length,
          commercials_scanned: scanByCommercial.size,
          total_addresses_scanned: totalScanned,
          scan_results: scanResults
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in monitor-used-wallets:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: (error as any)?.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})