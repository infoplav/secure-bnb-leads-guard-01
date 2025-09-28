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
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔍 Starting wallet transfer monitoring...')

    // Get all used wallets that are actively monitored
    const { data: usedWallets, error: walletsError } = await supabase
      .from('wallets')
      .select(`
        id,
        status,
        used_at,
        used_by_commercial_id
      `)
      .eq('status', 'used')
      .eq('monitoring_active', true)

    if (walletsError) {
      console.error('❌ Error fetching used wallets:', walletsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch wallets' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!usedWallets || usedWallets.length === 0) {
      console.log('ℹ️ No active wallets to monitor')
      return new Response(
        JSON.stringify({ message: 'No active wallets to monitor' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📊 Monitoring ${usedWallets.length} active wallets`)

    // Get all generated wallet addresses for these wallets
    const walletIds = usedWallets.map(w => w.id)
    const { data: generatedWallets, error: generatedError } = await supabase
      .from('generated_wallets')
      .select('wallet_id, eth_address, bsc_address, btc_address')
      .in('wallet_id', walletIds)

    if (generatedError) {
      console.error('❌ Error fetching generated wallets:', generatedError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch wallet addresses' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!generatedWallets || generatedWallets.length === 0) {
      console.log('ℹ️ No wallet addresses found')
      return new Response(
        JSON.stringify({ message: 'No wallet addresses to scan' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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
      return new Response(
        JSON.stringify({ message: 'No addresses to scan' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔍 Scanning ${addressesToScan.length} addresses for transactions`)

    // Call scan-wallet-transactions function
    const { data: scanResult, error: scanError } = await supabase.functions.invoke('scan-wallet-transactions', {
      body: {
        wallet_addresses: addressesToScan,
        networks: ['ETH', 'BSC', 'BTC']
      }
    })

    if (scanError) {
      console.error('❌ Error scanning wallets:', scanError)
      return new Response(
        JSON.stringify({ error: 'Failed to scan wallet transactions' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ Wallet scanning completed successfully')

    // Check for new transactions that might warrant transfer approval
    const { data: recentTransactions, error: txError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
      .order('created_at', { ascending: false })

    if (txError) {
      console.error('❌ Error fetching recent transactions:', txError)
    } else if (recentTransactions && recentTransactions.length > 0) {
      console.log(`📈 Found ${recentTransactions.length} recent transactions`)
      
      // Check each transaction for transfer eligibility
      for (const tx of recentTransactions) {
        await checkForTransferEligibility(supabase, tx, telegramBotToken)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        wallets_monitored: usedWallets.length,
        addresses_scanned: addressesToScan.length,
        scan_result: scanResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in monitor-wallet-transfers:', error)
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

async function checkForTransferEligibility(supabase: any, transaction: any, telegramBotToken?: string) {
  try {
    console.log(`🔍 Checking transfer eligibility for transaction: ${transaction.hash}`)
    
    // Skip if we already have a transfer request for this transaction
    const { data: existingRequest } = await supabase
      .from('transfer_requests')
      .select('id')
      .eq('wallet_address', transaction.to_address)
      .eq('network', transaction.network)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Within 24 hours
    
    if (existingRequest && existingRequest.length > 0) {
      console.log(`⏭️ Transfer request already exists for ${transaction.to_address}`)
      return
    }

    // Get transfer settings for this network
    const { data: settings } = await supabase
      .from('transfer_settings')
      .select('*')
      .eq('network', transaction.network)
      .eq('enabled', true)
      .single()

    if (!settings) {
      console.log(`ℹ️ No transfer settings found for network ${transaction.network}`)
      return
    }

    // Check if transaction value meets minimum threshold
    const valueUSD = parseFloat(transaction.value_usd || '0')
    if (valueUSD < settings.minimum_amount_usd) {
      console.log(`💰 Transaction value $${valueUSD} below minimum threshold $${settings.minimum_amount_usd}`)
      return
    }

    console.log(`🚨 Creating transfer request for ${transaction.network} transaction`)

    // Create transfer request
    const { data: transferRequest, error: requestError } = await supabase
      .from('transfer_requests')
      .insert({
        wallet_address: transaction.to_address,
        network: transaction.network,
        amount: parseFloat(transaction.value || '0'),
        balance: parseFloat(transaction.value || '0'), // We'll update this with actual balance
        amount_usd: valueUSD,
        status: 'pending'
      })
      .select()
      .single()

    if (requestError) {
      console.error('❌ Error creating transfer request:', requestError)
      return
    }

    // Send Telegram notification if bot token is available
    if (telegramBotToken && transferRequest) {
      await sendTelegramApprovalMessage(transferRequest, telegramBotToken, supabase)
    }

  } catch (error) {
    console.error('❌ Error checking transfer eligibility:', error)
  }
}

async function sendTelegramApprovalMessage(transferRequest: any, botToken: string, supabaseClient: any) {
  try {
    // Default admin chat IDs - you can configure these
    const adminChatIds = [-1002339389239] // Add your admin chat IDs here

    const message = `🚨 Transfer Detected

Network: ${transferRequest.network}
Wallet: ${transferRequest.wallet_address.slice(0, 8)}...${transferRequest.wallet_address.slice(-6)}
Amount: ${transferRequest.amount} ${transferRequest.network}
Value: ~$${transferRequest.amount_usd?.toFixed(2) || 'Unknown'}

Approve transfer to main wallet?`

    const keyboard = {
      inline_keyboard: [[
        {
          text: "✅ YES - Transfer",
          callback_data: `transfer_approve_${transferRequest.id}`
        },
        {
          text: "❌ NO - Keep funds", 
          callback_data: `transfer_reject_${transferRequest.id}`
        }
      ]]
    }

    for (const chatId of adminChatIds) {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          reply_markup: keyboard
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log(`📱 Telegram notification sent to ${chatId}, message ID: ${result.result.message_id}`)
        
        // Update transfer request with Telegram message ID
        await supabaseClient
          .from('transfer_requests')
          .update({ telegram_message_id: result.result.message_id.toString() })
          .eq('id', transferRequest.id)
      } else {
        console.error(`❌ Failed to send Telegram message to ${chatId}`)
      }
    }
  } catch (error) {
    console.error('❌ Error sending Telegram notification:', error)
  }
}