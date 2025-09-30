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
    console.log('🧹 Starting wallet cleanup process...')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Find wallets older than 5 hours
    const fiveHoursAgo = new Date(Date.now() - (5 * 60 * 60 * 1000)).toISOString()
    
    const { data: oldWallets, error: walletsError } = await supabase
      .from('wallets')
      .select(`
        id,
        wallet_phrase,
        used_at,
        used_by_commercial_id
      `)
      .eq('status', 'used')
      .lt('used_at', fiveHoursAgo)

    if (walletsError) {
      console.error('❌ Error fetching old wallets:', walletsError)
      return new Response(JSON.stringify({ error: 'Failed to fetch wallets' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!oldWallets || oldWallets.length === 0) {
      console.log('✅ No wallets to clean up')
      return new Response(JSON.stringify({ 
        success: true,
        message: 'No wallets to clean up',
        removed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`📋 Found ${oldWallets.length} wallets older than 5 hours`)

    let removedCount = 0
    let keptCount = 0

    // Check each wallet for transactions
    for (const wallet of oldWallets) {
      console.log(`\n🔍 Checking wallet ${wallet.id}...`)

      // Get generated wallet addresses
      const { data: generatedWallet } = await supabase
        .from('generated_wallets')
        .select('id, eth_address, bsc_address, btc_address')
        .eq('wallet_id', wallet.id)
        .single()

      if (!generatedWallet) {
        console.log(`⚠️ No generated wallet found for ${wallet.id}, skipping`)
        continue
      }

      // Check for any transactions on ETH, BSC, or BTC
      const { data: transactions, error: txError } = await supabase
        .from('wallet_transactions')
        .select('id')
        .eq('generated_wallet_id', generatedWallet.id)
        .limit(1)

      if (txError) {
        console.error(`❌ Error checking transactions for wallet ${wallet.id}:`, txError)
        continue
      }

      // If there are transactions, keep the wallet and disable monitoring
      if (transactions && transactions.length > 0) {
        console.log(`💰 Wallet ${wallet.id} has transactions - keeping but disabling monitoring`)
        
        await supabase
          .from('wallets')
          .update({ monitoring_active: false })
          .eq('id', wallet.id)

        await supabase
          .from('generated_wallets')
          .update({ is_monitoring_active: false })
          .eq('id', generatedWallet.id)

        keptCount++
        continue
      }

      // No transactions found - remove the wallet completely
      console.log(`🗑️ Wallet ${wallet.id} has no transactions - removing completely`)

      // Delete wallet transactions (if any exist)
      await supabase
        .from('wallet_transactions')
        .delete()
        .eq('generated_wallet_id', generatedWallet.id)

      // Delete generated wallet
      const { error: deleteGenError } = await supabase
        .from('generated_wallets')
        .delete()
        .eq('id', generatedWallet.id)

      if (deleteGenError) {
        console.error(`❌ Error deleting generated wallet ${generatedWallet.id}:`, deleteGenError)
        continue
      }

      // Reset parent wallet to available
      const { error: resetError } = await supabase
        .from('wallets')
        .update({
          status: 'available',
          used_by_commercial_id: null,
          used_at: null,
          client_tracking_id: null,
          client_balance: 0,
          monitoring_active: true
        })
        .eq('id', wallet.id)

      if (resetError) {
        console.error(`❌ Error resetting wallet ${wallet.id}:`, resetError)
      } else {
        console.log(`✅ Wallet ${wallet.id} reset to available`)
        removedCount++
      }
    }

    console.log(`\n📊 Cleanup complete: ${removedCount} wallets removed, ${keptCount} wallets kept (with transactions)`)

    return new Response(JSON.stringify({
      success: true,
      message: 'Cleanup completed',
      removed: removedCount,
      kept: keptCount,
      total: oldWallets.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('❌ Error in cleanup:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

