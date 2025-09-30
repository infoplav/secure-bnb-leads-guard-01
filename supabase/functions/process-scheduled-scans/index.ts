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
    console.log('⏰ Processing scheduled wallet scans...')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Find pending scans that are due
    const now = new Date().toISOString()
    
    const { data: dueScans, error: scansError } = await supabase
      .from('wallet_scan_schedule')
      .select(`
        id,
        generated_wallet_id,
        scan_number,
        scheduled_at,
        generated_wallets(
          eth_address,
          bsc_address,
          btc_address,
          is_monitoring_active
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_at', now)
      .limit(20)

    if (scansError) {
      console.error('❌ Error fetching due scans:', scansError)
      return new Response(JSON.stringify({ error: 'Failed to fetch scans' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!dueScans || dueScans.length === 0) {
      console.log('✅ No scans due at this time')
      return new Response(JSON.stringify({ 
        success: true,
        message: 'No scans due',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`📋 Found ${dueScans.length} scans to process`)

    let processedCount = 0
    let errorCount = 0

    // Process each scan
    for (const scan of dueScans) {
      const genWallet = (scan as any).generated_wallets
      
      if (!genWallet) {
        console.log(`⚠️ Wallet not found for scan ${scan.id}, marking as completed`)
        await supabase
          .from('wallet_scan_schedule')
          .update({ 
            status: 'completed',
            executed_at: new Date().toISOString(),
            error_message: 'Wallet not found'
          })
          .eq('id', scan.id)
        continue
      }

      // Skip if monitoring is disabled
      if (!genWallet.is_monitoring_active) {
        console.log(`⏭️ Monitoring disabled for wallet ${scan.generated_wallet_id}, skipping`)
        await supabase
          .from('wallet_scan_schedule')
          .update({ 
            status: 'completed',
            executed_at: new Date().toISOString(),
            error_message: 'Monitoring disabled'
          })
          .eq('id', scan.id)
        continue
      }

      console.log(`🔍 Processing scan #${scan.scan_number} for wallet ${scan.generated_wallet_id}`)

      // Collect addresses
      const addresses = [genWallet.eth_address, genWallet.bsc_address, genWallet.btc_address].filter(Boolean)

      try {
        // Invoke scan-wallet-transactions
        const { error: scanError } = await supabase.functions.invoke('scan-wallet-transactions', {
          body: {
            wallet_addresses: addresses,
            networks: ['ETH', 'BSC', 'BTC'],
            monitoring_mode: true,
            full_rescan: false
          }
        })

        if (scanError) {
          console.error(`❌ Error scanning wallet ${scan.generated_wallet_id}:`, scanError)
          await supabase
            .from('wallet_scan_schedule')
            .update({ 
              status: 'failed',
              executed_at: new Date().toISOString(),
              error_message: scanError.message || 'Scan failed'
            })
            .eq('id', scan.id)
          errorCount++
        } else {
          console.log(`✅ Scan completed for wallet ${scan.generated_wallet_id}`)
          await supabase
            .from('wallet_scan_schedule')
            .update({ 
              status: 'completed',
              executed_at: new Date().toISOString()
            })
            .eq('id', scan.id)
          processedCount++
        }
      } catch (err: any) {
        console.error(`❌ Exception scanning wallet ${scan.generated_wallet_id}:`, err)
        await supabase
          .from('wallet_scan_schedule')
          .update({ 
            status: 'failed',
            executed_at: new Date().toISOString(),
            error_message: err.message || 'Exception occurred'
          })
          .eq('id', scan.id)
        errorCount++
      }

      // Small delay between scans
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    console.log(`\n📊 Processed ${processedCount} scans, ${errorCount} errors`)

    return new Response(JSON.stringify({
      success: true,
      message: 'Scheduled scans processed',
      processed: processedCount,
      errors: errorCount,
      total: dueScans.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('❌ Error processing scheduled scans:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
