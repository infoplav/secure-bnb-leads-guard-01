import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔍 Starting periodic wallet monitoring scan...')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get all used wallets that are actively monitored within 5 hours
    const fiveHoursAgo = new Date(Date.now() - (5 * 60 * 60 * 1000)).toISOString();
    
    const { data: activeWallets, error: walletsError } = await supabase
      .from('wallets')
      .select(`
        id,
        status,
        used_at,
        used_by_commercial_id
      `)
      .eq('status', 'used')
      .eq('monitoring_active', true)
      .gte('used_at', fiveHoursAgo)

    if (walletsError) {
      console.error('❌ Error fetching active wallets:', walletsError)
      return new Response(JSON.stringify({ error: 'Failed to fetch wallets' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!activeWallets || activeWallets.length === 0) {
      console.log('ℹ️ No active wallets to monitor')
      return new Response(JSON.stringify({ 
        success: true,
        message: 'No active wallets to monitor' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`📊 Monitoring ${activeWallets.length} active wallets`)

    // Get all generated wallet addresses for these wallets
    const walletIds = activeWallets.map(w => w.id)
    const { data: generatedWallets, error: generatedError } = await supabase
      .from('generated_wallets')
      .select('wallet_id, eth_address, bsc_address, btc_address')
      .in('wallet_id', walletIds)

    if (generatedError) {
      console.error('❌ Error fetching generated wallets:', generatedError)
      return new Response(JSON.stringify({ error: 'Failed to fetch wallet addresses' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!generatedWallets || generatedWallets.length === 0) {
      console.log('ℹ️ No wallet addresses found')
      return new Response(JSON.stringify({ 
        success: true,
        message: 'No wallet addresses to scan' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Collect all addresses to scan
    const addressesToScan: string[] = []
    for (const gw of generatedWallets) {
      if (gw.eth_address) addressesToScan.push(gw.eth_address)
      if (gw.bsc_address) addressesToScan.push(gw.bsc_address)
      if (gw.btc_address) addressesToScan.push(gw.btc_address)
    }

    if (addressesToScan.length === 0) {
      console.log('ℹ️ No addresses to scan')
      return new Response(JSON.stringify({ 
        success: true,
        message: 'No addresses to scan' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`🔍 Scanning ${addressesToScan.length} addresses for transactions`)

    // Process addresses in batches to avoid timeouts
    // Increased batch size and reduced delay for better efficiency
    const BATCH_SIZE = 12
    const BATCH_DELAY_MS = 1000
    const batches: string[][] = []
    
    for (let i = 0; i < addressesToScan.length; i += BATCH_SIZE) {
      batches.push(addressesToScan.slice(i, i + BATCH_SIZE))
    }

    console.log(`🧩 Created ${batches.length} batches (size ${BATCH_SIZE}) for scanning`)

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    // Background processing function
    async function processBatches() {
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        console.log(`🚀 Scanning batch ${i + 1}/${batches.length} with ${batch.length} addresses`)
        
        const { error: scanError } = await supabase.functions.invoke('scan-wallet-transactions', {
          body: {
            wallet_addresses: batch,
            networks: ['ETH', 'BSC', 'BTC'],
            monitoring_mode: true,
            full_rescan: false
          }
        })

        if (scanError) {
          console.error(`❌ Error scanning batch ${i + 1}:`, scanError)
        } else {
          console.log(`✅ Finished batch ${i + 1}/${batches.length}`)
        }

        // Delay between batches
        if (i < batches.length - 1) {
          await sleep(BATCH_DELAY_MS)
        }
      }

      // Note: scan-wallet-transactions handles:
      // - Creating wallet_transactions (with hash+network deduplication)
      // - Creating transfer_requests (when thresholds are met)
      // - Sending Telegram notifications for new transactions
      // This function only orchestrates batch scanning

      console.log('🏁 Monitoring cycle completed')
    }

    // Run in background to prevent timeouts
    ;(globalThis as any).EdgeRuntime?.waitUntil?.(processBatches()) ?? processBatches()

    return new Response(JSON.stringify({
      success: true,
      message: 'Monitoring scan scheduled in background',
      wallets_monitored: activeWallets.length,
      addresses_scanned: addressesToScan.length,
      batches: batches.length,
      batch_size: BATCH_SIZE
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('❌ Error in monitoring:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
