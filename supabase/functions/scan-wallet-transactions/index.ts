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
    const etherscanApiKey = Deno.env.get('ETHERSCAN_API_KEY')
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Determine which networks to scan (default to BSC and ETH)
    const requestedNetworks = networks && Array.isArray(networks) && networks.length > 0 
      ? networks 
      : ['BSC', 'ETH']

    console.log(`Starting transaction scan for ${wallet_addresses.length} wallets on networks: ${requestedNetworks.join(', ')}`)

    // Normalize and deduplicate wallet addresses
    const uniqueAddresses = [...new Set(wallet_addresses.map(addr => addr.toLowerCase()))]
    
    let allTransactions = []
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
          
          if (network === 'ETH' && isEVMAddress && etherscanApiKey) {
            transactions = await fetchEtherscanTransactions(walletAddress, etherscanApiKey, 'mainnet', scanState?.last_scanned_block)
          } else if (network === 'BSC' && isEVMAddress && etherscanApiKey) {
            transactions = await fetchBscScanTransactions(walletAddress, etherscanApiKey, scanState?.last_scanned_block)
          } else if (network === 'BTC' && isBitcoinAddress) {
            transactions = await fetchBitcoinTransactions(walletAddress, scanState?.last_seen_at)
          } else if (network === 'SOL' && isSolanaAddress) {
            transactions = await fetchSolanaTransactions(walletAddress, scanState?.last_signature)
          } else {
            console.log(`Skipping ${network} for address ${walletAddress} - unsupported combination or missing API key`)
            continue
          }
          
          // Add network info to transactions
          transactions = transactions.map(tx => ({ ...tx, network }))
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
          console.error(`Error fetching ${network} transactions for ${walletAddress}:`, error.message)
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

        // Get generated wallet info based on network
        let walletQuery
        if (transaction.network === 'ETH') {
          walletQuery = supabase.from('generated_wallets').select('*').eq('eth_address', walletAddress)
        } else if (transaction.network === 'BSC') {
          walletQuery = supabase.from('generated_wallets').select('*').eq('bsc_address', walletAddress)
        } else if (transaction.network === 'BTC') {
          walletQuery = supabase.from('generated_wallets').select('*').eq('btc_address', walletAddress)
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
        const txType = (transaction?.to && String(transaction.to).toLowerCase() === walletAddress)
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

        // Send Telegram notification for transaction
        if (generatedWallet && usdValue > 0) {
          const message = `🚨 Transaction Detected!\n` +
            `Wallet: ${generatedWallet.address}\n` +
            `Commercial: ${generatedWallet.commercial_id}\n` +
            `Amount: $${usdValue.toFixed(2)} USD\n` +
            `Network: ${transaction.network}\n` +
            `Hash: ${transaction.hash || transaction.signature}\n` +
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
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// Fetch Ethereum transactions using Etherscan API with retry logic
async function fetchEtherscanTransactions(address: string, apiKey: string, network: string = 'mainnet', startBlock?: number) {
  const baseUrl = 'https://api.etherscan.io/api'
  const params = new URLSearchParams({
    module: 'account',
    action: 'txlist',
    address,
    startblock: startBlock?.toString() || '0',
    endblock: '99999999',
    page: '1',
    offset: '50', // Reduced from 100 to avoid rate limits
    sort: 'asc',
    apikey: apiKey
  })

  try {
    const response = await fetch(`${baseUrl}?${params}`)
    
    if (response.status === 429) {
      console.warn(`Rate limit hit for Etherscan API, waiting 5 seconds...`)
      await new Promise(resolve => setTimeout(resolve, 5000))
      throw new Error('Rate limit exceeded - will retry later')
    }
    
    if (!response.ok) {
      throw new Error(`Etherscan API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.status !== '1') {
      if (data.message === 'No transactions found') {
        return []
      }
      // Don't throw error for common API messages
      if (data.message === 'NOTOK' || data.result === 'Max rate limit reached') {
        console.warn(`Etherscan API limit: ${data.message || data.result}`)
        return []
      }
      throw new Error(`Etherscan API error: ${data.message || data.result}`)
    }

    return data.result || []
  } catch (error) {
    console.warn(`Etherscan API call failed for ${address}: ${error.message}`)
    return []
  }
}

// Fetch BSC transactions using BscScan API (same format as Etherscan) with retry logic
async function fetchBscScanTransactions(address: string, apiKey: string, startBlock?: number) {
  const baseUrl = 'https://api.bscscan.com/api'
  const params = new URLSearchParams({
    module: 'account',
    action: 'txlist',
    address,
    startblock: startBlock?.toString() || '0',
    endblock: '99999999',
    page: '1',
    offset: '50', // Reduced from 100 to avoid rate limits
    sort: 'asc',
    apikey: apiKey
  })

  try {
    const response = await fetch(`${baseUrl}?${params}`)
    
    if (response.status === 429) {
      console.warn(`Rate limit hit for BscScan API, waiting 5 seconds...`)
      await new Promise(resolve => setTimeout(resolve, 5000))
      throw new Error('Rate limit exceeded - will retry later')
    }
    
    if (!response.ok) {
      throw new Error(`BscScan API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.status !== '1') {
      if (data.message === 'No transactions found') {
        return []
      }
      // Don't throw error for common API messages
      if (data.message === 'NOTOK' || data.result === 'Max rate limit reached') {
        console.warn(`BscScan API limit: ${data.message || data.result}`)
        return []
      }
      throw new Error(`BscScan API error: ${data.message || data.result}`)
    }

    return data.result || []
  } catch (error) {
    console.warn(`BscScan API call failed for ${address}: ${error.message}`)
    return []
  }
}

// Fetch Bitcoin transactions using mempool.space API
async function fetchBitcoinTransactions(address: string, lastSeenAt?: string) {
  const baseUrl = 'https://mempool.space/api/address'
  const response = await fetch(`${baseUrl}/${address}/txs`)
  
  if (!response.ok) {
    throw new Error(`Mempool.space API error: ${response.status}`)
  }

  const transactions = await response.json()
  
  // Filter by last seen timestamp if provided
  if (lastSeenAt) {
    const lastSeenTimestamp = new Date(lastSeenAt).getTime() / 1000
    return transactions.filter((tx: any) => tx.status.block_time > lastSeenTimestamp)
  }

  return transactions.map((tx: any) => ({
    hash: tx.txid,
    from: tx.vin[0]?.prevout?.scriptpubkey_address || '',
    to: tx.vout[0]?.scriptpubkey_address || '',
    value: tx.vout.reduce((sum: number, output: any) => sum + output.value, 0).toString(),
    blockNumber: tx.status.block_height,
    timeStamp: tx.status.block_time,
    gasUsed: tx.fee,
    gasPrice: '0'
  }))
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
    console.warn(`Error fetching price for ${coinId}:`, error.message)
    return 0
  }
}