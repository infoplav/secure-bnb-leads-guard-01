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
    const { wallet_addresses, commercial_id, networks, from_date, full_rescan } = await req.json()
    
    if (!wallet_addresses || !Array.isArray(wallet_addresses) || wallet_addresses.length === 0) {
      return new Response(
        JSON.stringify({ error: 'wallet_addresses must be a non-empty array' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const alchemyApiKey = Deno.env.get('ALCHEMY_API_KEY')
    const moralisApiKey = Deno.env.get('MORALIS_API_KEY')
    const blockCypherApiKey = Deno.env.get('BLOCKCYPHER_API_KEY')
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Determine which networks to scan (default to BSC and ETH)
    const requestedNetworks = networks && Array.isArray(networks) && networks.length > 0 
      ? networks 
      : ['BSC', 'ETH']

    console.log(`Starting transaction scan for ${wallet_addresses.length} wallets on networks: ${requestedNetworks.join(', ')}`)

    // Normalize and deduplicate wallet addresses
    const uniqueAddresses = [...new Set(wallet_addresses.map(addr => addr.toLowerCase()))]
    
    let allTransactions: any[] = []
    let scannedCount = 0
    let processedCount = 0

    // Process each unique wallet address with rate limiting
    for (let i = 0; i < uniqueAddresses.length; i++) {
      const walletAddress = uniqueAddresses[i]
      console.log(`Processing wallet ${i + 1}/${uniqueAddresses.length}: ${walletAddress}`)
      
      // Check if address is valid format (EVM, Bitcoin, or Solana)
      const isEVMAddress = /^0x[a-fA-F0-9]{40}$/.test(walletAddress)
      const isBitcoinAddress = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/.test(walletAddress)
      const isSolanaAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)
      
      if (!isEVMAddress && !isBitcoinAddress && !isSolanaAddress) {
        console.warn(`Skipping invalid wallet address: ${walletAddress}`)
        continue
      }

      // Check if the wallet is still within the 48-hour monitoring window (for USED wallets)
      const { data: generatedWallet } = await supabase
        .from('generated_wallets')
        .select(`
          created_at,
          wallets(status, used_at)
        `)
        .or(`eth_address.eq.${walletAddress},bsc_address.eq.${walletAddress},btc_address.eq.${walletAddress}`)
        .maybeSingle();

      if (generatedWallet) {
        let shouldSkip = false;
        
        const w = (generatedWallet as any)?.wallets;
        if (w && w.status === 'used' && w.used_at) {
          // For wallets with status 'used', check based on used_at
          const usedAge = Date.now() - new Date(w.used_at).getTime();
          const fortyEightHours = 48 * 60 * 60 * 1000;
          
          if (usedAge > fortyEightHours) {
            console.log(`Skipping wallet ${walletAddress} - used more than 48 hours ago`);
            shouldSkip = true;
          }
        } else {
          // For seed-only wallets (no associated wallet record), check based on created_at
          const walletAge = Date.now() - new Date(generatedWallet.created_at).getTime();
          const fortyEightHours = 48 * 60 * 60 * 1000;
          
          if (walletAge > fortyEightHours) {
            console.log(`Skipping seed-only wallet ${walletAddress} - created more than 48 hours ago`);
            shouldSkip = true;
          }
        }
        
        if (shouldSkip) {
          continue;
        }
      }

      // Check if this wallet was scanned recently (within 10 minutes)
      if (!full_rescan) {
        const { data: recentScans } = await supabase
          .from('address_scan_state')
          .select('last_seen_at')
          .eq('address', walletAddress)
          .gte('last_seen_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())

        if (recentScans && recentScans.length > 0) {
          console.log(`Skipping ${walletAddress} - scanned within last 10 minutes`)
          continue
        }
      } else {
        console.log(`Bypassing cooldown for full rescan of ${walletAddress}`)
      }

      // Get or create scan state for incremental scanning
      const { data: scanStates } = await supabase
        .from('address_scan_state')
        .select('*')
        .eq('address', walletAddress)
        .in('network', requestedNetworks)

      // Add delay between wallets to prevent API rate limiting (2 seconds)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      // Fetch transactions for each requested network
      for (const network of requestedNetworks) {
        try {
          let transactions = []
          const scanState = full_rescan ? undefined : scanStates?.find(s => s.network === network)
          
          // Add delay between network calls to prevent rate limiting (1 second)
          if (requestedNetworks.indexOf(network) > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
          
          if (network === 'ETH' && isEVMAddress && moralisApiKey) {
            transactions = await fetchMoralisTransactions(walletAddress, moralisApiKey, 'eth', scanState?.last_scanned_block)
          } else if (network === 'BSC' && isEVMAddress && moralisApiKey) {
            transactions = await fetchMoralisTransactions(walletAddress, moralisApiKey, 'bsc', scanState?.last_scanned_block)
          } else if (network === 'BTC' && isBitcoinAddress && blockCypherApiKey) {
            transactions = await fetchBlockCypherTransactions(walletAddress, blockCypherApiKey, scanState?.last_seen_at)
          } else if (network === 'SOL' && isSolanaAddress) {
            transactions = await fetchSolanaTransactions(walletAddress, scanState?.last_signature)
          } else {
            console.log(`Skipping ${network} for address ${walletAddress} - unsupported combination or missing API key`)
            continue
          }
          
          // Add network info to transactions
          transactions = transactions.map((tx: any) => ({ ...tx, network }))
          allTransactions = allTransactions.concat(transactions)
          
          // Update scan state
          if (transactions.length > 0) {
            const lastTx = transactions[transactions.length - 1]
            const updateData: any = {
              address: walletAddress,
              network,
              last_seen_at: new Date().toISOString(),
              commercial_id,
            }

            if (network === 'ETH' || network === 'BSC') {
              updateData.last_scanned_block = lastTx.blockNumber
            } else if (network === 'SOL') {
              updateData.last_signature = lastTx.signature
            }

            await supabase
              .from('address_scan_state')
              .upsert(updateData, { onConflict: 'address,network' })
          }
          
          console.log(`Found ${transactions.length} ${network} transactions for ${walletAddress}`)
          scannedCount++
        } catch (error) {
          console.error(`Error fetching ${network} transactions for ${walletAddress}:`, (error as any)?.message)
        }
      }
      
      // Update cooldown timestamp even if no transactions were found
      try {
        await supabase
          .from('address_scan_state')
          .upsert({
            address: walletAddress,
            network: 'GLOBAL',
            last_seen_at: new Date().toISOString(),
            commercial_id
          }, { onConflict: 'address,network' });
      } catch (e) {
        console.warn(`Failed to upsert cooldown state for ${walletAddress}:`, (e as any)?.message || e);
      }
    }
    
    // Process and save transactions
    for (const transaction of allTransactions) {
      try {
        // Check if transaction already exists
        const { data: existingTx } = await supabase
          .from('wallet_transactions')
          .select('id')
          .eq('transaction_hash', transaction.hash || transaction.signature)
          .eq('network', transaction.network)
          .single()

        if (existingTx) {
          console.log(`Transaction ${transaction.hash || transaction.signature} already exists, skipping`)
          continue
        }

        // Get the wallet address from the transaction (to_address for deposits, from_address for withdrawals)
        const transactionWalletAddress = transaction.to || transaction.from
        if (!transactionWalletAddress) {
          console.log(`No wallet address found in transaction ${transaction.hash || transaction.signature}`)
          continue
        }

        // Get generated wallet info based on network
        let walletQuery
        if (transaction.network === 'ETH') {
          walletQuery = supabase.from('generated_wallets').select('*').eq('eth_address', transactionWalletAddress.toLowerCase())
        } else if (transaction.network === 'BSC') {
          walletQuery = supabase.from('generated_wallets').select('*').eq('bsc_address', transactionWalletAddress.toLowerCase())
        } else if (transaction.network === 'BTC') {
          walletQuery = supabase.from('generated_wallets').select('*').eq('btc_address', transactionWalletAddress)
        } else {
          continue // Skip unknown networks
        }
        
        const { data: generatedWallet } = await walletQuery.single()

        if (!generatedWallet) {
          console.log(`No generated wallet found for address in transaction ${transaction.hash || transaction.signature}`)
          continue
        }

        // Get token price for native coins
        let tokenPrice = 0
        if (transaction.network === 'ETH') {
          tokenPrice = await fetchCoinGeckoPrice('ethereum')
        } else if (transaction.network === 'BSC') {
          tokenPrice = await fetchCoinGeckoPrice('binancecoin')
        } else if (transaction.network === 'BTC') {
          tokenPrice = await fetchCoinGeckoPrice('bitcoin')
        } else if (transaction.network === 'SOL') {
          tokenPrice = await fetchCoinGeckoPrice('solana')
        }

        // Calculate USD value
        const valueInNative = parseFloat(transaction.value) / Math.pow(10, getNetworkDecimals(transaction.network))
        const usdValue = valueInNative * tokenPrice

        // Prepare values for insertion
        const decimals = getNetworkDecimals(transaction.network)
        const amount = Number(transaction.value) / Math.pow(10, decimals)
        const timestampMs = transaction.timeStamp
          ? Number(transaction.timeStamp) * 1000
          : (transaction.blockTime ? Number(transaction.blockTime) * 1000 : Date.now())
        const txType = (transaction?.to && String(transaction.to).toLowerCase() === transactionWalletAddress.toLowerCase())
          ? 'deposit'
          : 'withdrawal'
        const tokenSymbol = transaction.network === 'ETH' ? 'ETH' : (transaction.network === 'BSC' ? 'BNB' : transaction.network)

        // Insert transaction matching DB schema
        const { error: insertError } = await supabase
          .from('wallet_transactions')
          .insert({
            transaction_hash: transaction.hash || transaction.signature,
            from_address: transaction.from || null,
            to_address: transaction.to || null,
            amount: amount,
            amount_usd: usdValue,
            price_at_time: tokenPrice,
            block_number: transaction.blockNumber || null,
            timestamp: new Date(timestampMs).toISOString(),
            network: transaction.network,
            token_symbol: tokenSymbol,
            transaction_type: txType,
            generated_wallet_id: generatedWallet.id,
            commercial_id: generatedWallet.commercial_id
          })

        if (insertError) {
          console.error(`Error inserting transaction ${transaction.hash || transaction.signature}:`, insertError)
          continue
        }

        // Check if this transaction qualifies for auto-transfer approval
        if (generatedWallet && usdValue >= 10 && txType === 'deposit') { // Minimum $10 deposit for transfer consideration
          // Get transfer settings for this network
          const { data: transferSettings } = await supabase
            .from('transfer_settings')
            .select('*')
            .eq('network', transaction.network.toUpperCase())
            .eq('enabled', true)
            .single();

          if (transferSettings && usdValue >= transferSettings.minimum_amount_usd) {
            // Create transfer request
            const { data: transferRequest, error: transferError } = await supabase
              .from('transfer_requests')
              .insert({
                wallet_address: transactionWalletAddress,
                network: transaction.network.toUpperCase(),
                amount: amount,
                balance: amount, // For now, assume transaction amount = balance
                amount_usd: usdValue,
                commercial_id: generatedWallet.commercial_id,
                generated_wallet_id: generatedWallet.id,
                status: 'pending'
              })
              .select()
              .single();

            if (transferError) {
              console.error('❌ Error creating transfer request:', transferError);
            } else {
              console.log(`✅ Created transfer request for $${usdValue.toFixed(2)} transaction`);

              // Send admin approval message
              const approvalMessage = `🚨 Transfer Detected\n` +
                `Network: ${transaction.network.toUpperCase()}\n` +
                `Wallet: ${transactionWalletAddress.slice(0, 8)}...${transactionWalletAddress.slice(-6)}\n` +
                `Amount: ${amount.toFixed(6)} ${transaction.network.toUpperCase()}\n` +
                `USD Value: $${usdValue.toFixed(2)}\n\n` +
                `Approve transfer to main wallet?`;

              try {
                const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
                if (telegramBotToken) {
                  const telegramResponse = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      chat_id: '1889039543', // Default admin chat
                      text: approvalMessage,
                      reply_markup: {
                        inline_keyboard: [[
                          { text: '✅ YES - Transfer', callback_data: `approve_${transferRequest.id}` },
                          { text: '❌ NO - Keep', callback_data: `reject_${transferRequest.id}` }
                        ]]
                      }
                    })
                  });

                  if (telegramResponse.ok) {
                    const responseData = await telegramResponse.json();
                    // Store message ID for callback handling
                    await supabase
                      .from('transfer_requests')
                      .update({ telegram_message_id: responseData.result.message_id.toString() })
                      .eq('id', transferRequest.id);
                  }
                }
              } catch (err) {
                console.error('❌ Error sending approval message:', err);
              }
            }
          }
        }

        // Send Telegram notification for transaction (regular notification)
        if (generatedWallet && usdValue > 0) {
          const message = `💰 Transaction Detected!\n` +
            `Wallet: ${transactionWalletAddress.slice(0, 8)}...${transactionWalletAddress.slice(-6)}\n` +
            `Commercial: ${generatedWallet.commercial_id}\n` +
            `Amount: $${usdValue.toFixed(2)} USD\n` +
            `Network: ${transaction.network.toUpperCase()}\n` +
            `Hash: ${(transaction.hash || transaction.signature).slice(0, 12)}...${(transaction.hash || transaction.signature).slice(-8)}\n` +
            `Type: ${txType}\n` +
            `Time: ${new Date(timestampMs).toISOString()}`

          try {
            await supabase.functions.invoke('send-telegram-notification', {
              body: { 
                message,
                chat_ids: ['1889039543', '5433409472'] // Default admin chat IDs
              }
            })
            console.log(`Telegram notification sent for transaction ${transaction.hash || transaction.signature}`)
          } catch (notificationError) {
            console.error('Failed to send Telegram notification:', notificationError)
          }
        }

        processedCount++
      } catch (error) {
        console.error(`Error processing transaction ${transaction.hash || transaction.signature}:`, error)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Scan completed. Scanned ${scannedCount} wallet-network combinations, found ${allTransactions.length} transactions, processed ${processedCount} new transactions.`,
        stats: {
          wallets_scanned: scannedCount,
          transactions_found: allTransactions.length,
          transactions_processed: processedCount
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error in scan-wallet-transactions:', error)
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

// Fetch Ethereum transactions using Alchemy API
async function fetchAlchemyTransactions(address: string, apiKey: string, network: string = 'mainnet', startBlock?: number) {
  const baseUrl = `https://eth-${network}.g.alchemy.com/v2/${apiKey}`
  
  try {
    const body = {
      id: 1,
      jsonrpc: "2.0",
      method: "alchemy_getAssetTransfers",
      params: [{
        fromBlock: startBlock ? `0x${startBlock.toString(16)}` : "0x0",
        toBlock: "latest",
        fromAddress: address,
        toAddress: address,
        category: ["external", "internal"],
        maxCount: "0x32", // 50 transactions
        withMetadata: true,
        excludeZeroValue: false
      }]
    }

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body)
    })
    
    if (response.status === 429) {
      console.warn(`Rate limit hit for Alchemy API, waiting 5 seconds...`)
      await new Promise(resolve => setTimeout(resolve, 5000))
      throw new Error('Rate limit exceeded - will retry later')
    }
    
    if (!response.ok) {
      throw new Error(`Alchemy API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.error) {
      console.warn(`Alchemy API error: ${data.error.message}`)
      return []
    }

    // Convert Alchemy format to expected format
    const transfers = data.result?.transfers || []
    return transfers.map((transfer: any) => ({
      hash: transfer.hash,
      from: transfer.from,
      to: transfer.to,
      value: transfer.value ? (parseFloat(transfer.value) * Math.pow(10, 18)).toString() : '0',
      timeStamp: transfer.metadata?.blockTimestamp ? new Date(transfer.metadata.blockTimestamp).getTime() / 1000 : Date.now() / 1000,
      blockNumber: transfer.blockNum ? parseInt(transfer.blockNum, 16) : 0
    }))
  } catch (error) {
    console.warn(`Alchemy API call failed for ${address}: ${(error as any)?.message}`)
    return []
  }
}

// Fetch BSC transactions using Moralis API
async function fetchMoralisTransactions(address: string, apiKey: string, chain: string = 'bsc', startBlock?: number) {
  const chainParam = chain === 'bsc' ? '0x38' : '0x1'
  const baseUrl = `https://deep-index.moralis.io/api/v2.2/${address}`
  
  try {
    const params = new URLSearchParams({
      chain: chainParam,
      limit: '50'
    })
    
    if (startBlock) {
      params.append('from_block', startBlock.toString())
    }

    const response = await fetch(`${baseUrl}?${params}`, {
      headers: {
        'X-API-Key': apiKey,
        'Accept': 'application/json'
      }
    })
    
    if (response.status === 429) {
      console.warn(`Rate limit hit for Moralis API, waiting 5 seconds...`)
      await new Promise(resolve => setTimeout(resolve, 5000))
      throw new Error('Rate limit exceeded - will retry later')
    }
    
    if (!response.ok) {
      throw new Error(`Moralis API error: ${response.status}`)
    }

    const data = await response.json()
    
    // Convert Moralis format to expected format
    const transactions = data.result || []
    return transactions.map((tx: any) => ({
      hash: tx.hash,
      from: tx.from_address,
      to: tx.to_address,
      value: tx.value || '0',
      timeStamp: new Date(tx.block_timestamp).getTime() / 1000,
      blockNumber: parseInt(tx.block_number)
    }))
  } catch (error) {
    console.warn(`Moralis API call failed for ${address}: ${(error as any)?.message}`)
    return []
  }
}

// Fetch Bitcoin transactions using BlockCypher API
async function fetchBlockCypherTransactions(address: string, apiKey: string, lastSeenAt?: string) {
  const baseUrl = `https://api.blockcypher.com/v1/btc/main/addrs/${address}/full`
  
  try {
    const params = new URLSearchParams({
      token: apiKey,
      limit: '50'
    })

    const response = await fetch(`${baseUrl}?${params}`)
    
    if (response.status === 429) {
      console.warn(`Rate limit hit for BlockCypher API, waiting 5 seconds...`)
      await new Promise(resolve => setTimeout(resolve, 5000))
      throw new Error('Rate limit exceeded - will retry later')
    }
    
    if (!response.ok) {
      throw new Error(`BlockCypher API error: ${response.status}`)
    }

    const data = await response.json()
    const transactions = data.txs || []
    
    // Filter by last seen timestamp if provided
    if (lastSeenAt) {
      const lastSeenTimestamp = new Date(lastSeenAt).getTime() / 1000
      return transactions.filter((tx: any) => new Date(tx.confirmed).getTime() / 1000 > lastSeenTimestamp)
    }

    return transactions.map((tx: any) => ({
      hash: tx.hash,
      from: tx.inputs[0]?.addresses?.[0] || '',
      to: tx.outputs[0]?.addresses?.[0] || '',
      value: tx.outputs.reduce((sum: number, output: any) => sum + (output.value || 0), 0).toString(),
      blockNumber: tx.block_height || 0,
      timeStamp: tx.confirmed ? new Date(tx.confirmed).getTime() / 1000 : Date.now() / 1000,
      gasUsed: tx.fees || 0,
      gasPrice: '0'
    }))
  } catch (error) {
    console.warn(`BlockCypher API call failed for ${address}: ${(error as any)?.message}`)
    return []
  }
}

// Fetch Solana transactions using public RPC
async function fetchSolanaTransactions(address: string, lastSignature?: string) {
  const rpcUrl = 'https://api.mainnet-beta.solana.com'
  const params: any = {
    limit: 100
  }
  
  if (lastSignature) {
    params.before = lastSignature
  }

  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getSignaturesForAddress',
      params: [address, params]
    })
  })

  if (!response.ok) {
    throw new Error(`Solana RPC error: ${response.status}`)
  }

  const data = await response.json()
  
  if (data.error) {
    throw new Error(`Solana RPC error: ${data.error.message}`)
  }

  // Get transaction details for each signature
  const transactions = []
  for (const sig of (data.result || []).slice(0, 10)) { // Limit to prevent too many requests
    try {
      const txResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTransaction',
          params: [sig.signature, { encoding: 'json' }]
        })
      })

      const txData = await txResponse.json()
      if (txData.result) {
        const tx = txData.result
        transactions.push({
          signature: sig.signature,
          hash: sig.signature,
          from: tx.transaction?.message?.accountKeys?.[0] || '',
          to: tx.transaction?.message?.accountKeys?.[1] || '',
          value: (tx.meta?.preBalances?.[0] || 0) - (tx.meta?.postBalances?.[0] || 0),
          blockNumber: sig.slot,
          timeStamp: sig.blockTime,
          gasUsed: tx.meta?.fee || 0,
          gasPrice: '0'
        })
      }
    } catch (error) {
      console.warn(`Failed to fetch Solana transaction details for ${sig.signature}:`, error)
    }
  }

  return transactions
}

// Get network decimals for value conversion
function getNetworkDecimals(network: string): number {
  switch (network) {
    case 'ETH':
    case 'BSC':
      return 18
    case 'BTC':
      return 8
    case 'SOL':
      return 9
    default:
      return 18
  }
}

// Cache for token prices to avoid repeated API calls
const priceCache: { [key: string]: { price: number, timestamp: number } } = {}

// Fetch token price from CoinGecko (free API)
async function fetchCoinGeckoPrice(coinId: string): Promise<number> {
  const cacheKey = coinId
  const now = Date.now()
  const cacheExpiry = 5 * 60 * 1000 // 5 minutes

  // Check cache first
  if (priceCache[cacheKey] && (now - priceCache[cacheKey].timestamp) < cacheExpiry) {
    return priceCache[cacheKey].price
  }

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
    )

    if (!response.ok) {
      console.warn(`Failed to fetch price for ${coinId} from CoinGecko`)
      return 0
    }

    const data = await response.json()
    const price = data[coinId]?.usd || 0

    // Cache the result
    priceCache[cacheKey] = { price, timestamp: now }

    return price
  } catch (error) {
    console.warn(`Error fetching price for ${coinId}:`, (error as any)?.message)
    return 0
  }
}