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
    const etherscanApiKey = Deno.env.get('ETHERSCAN_API_KEY')
    
    if (!etherscanApiKey) {
      return new Response(
        JSON.stringify({ error: 'ETHERSCAN_API_KEY not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Testing Etherscan API with key:', etherscanApiKey ? 'Present' : 'Missing')

    // Test addresses
    const testAddresses = {
      eth: '0x252946c54a6fc6a0bb3e75501fc487b9de61bd25',
      bsc: '0x252946c54a6fc6a0bb3e75501fc487b9de61bd25',
      btc: 'bc1qsqd4pae8cejdmgrnu4swe3nna0xlnm0e7czc2u'
    }

    const results: any = {}

    // Test ETH
    try {
      console.log('Testing ETH API...')
      const ethResult = await testEtherscanAPI(testAddresses.eth, etherscanApiKey, 'eth')
      results.eth = ethResult
    } catch (error) {
      results.eth = { error: (error as any).message }
    }

    // Test BSC
    try {
      console.log('Testing BSC API...')
      const bscResult = await testEtherscanAPI(testAddresses.bsc, etherscanApiKey, 'bsc')
      results.bsc = bscResult
    } catch (error) {
      results.bsc = { error: (error as any).message }
    }

    // Test BlockCypher for BTC
    try {
      console.log('Testing BTC API...')
      const blockCypherApiKey = Deno.env.get('BLOCKCYPHER_API_KEY')
      if (blockCypherApiKey) {
        const btcResult = await testBlockCypherAPI(testAddresses.btc, blockCypherApiKey)
        results.btc = btcResult
      } else {
        results.btc = { error: 'BLOCKCYPHER_API_KEY not found' }
      }
    } catch (error) {
      results.btc = { error: (error as any).message }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Test function error:', error)
    return new Response(
      JSON.stringify({ error: (error as any).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function testEtherscanAPI(address: string, apiKey: string, chain: string) {
  const baseUrl = chain === 'bsc' 
    ? 'https://api.bscscan.com/api' 
    : 'https://api.etherscan.io/api'
  
  const params = new URLSearchParams({
    module: 'account',
    action: 'txlist',
    address: address,
    startblock: '0',
    endblock: '99999999',
    page: '1',
    offset: '10',
    sort: 'desc',
    apikey: apiKey
  })

  const url = `${baseUrl}?${params}`
  console.log(`Making ${chain.toUpperCase()} API call to:`, url.replace(apiKey, 'HIDDEN'))

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' }
  })

  console.log(`${chain.toUpperCase()} API response status:`, response.status)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const data = await response.json()
  console.log(`${chain.toUpperCase()} API response:`, JSON.stringify(data, null, 2))

  return {
    status: data.status,
    message: data.message,
    result_count: Array.isArray(data.result) ? data.result.length : 0,
    first_tx: Array.isArray(data.result) && data.result.length > 0 ? {
      hash: data.result[0].hash,
      from: data.result[0].from,
      to: data.result[0].to,
      value: data.result[0].value,
      timeStamp: data.result[0].timeStamp
    } : null
  }
}

async function testBlockCypherAPI(address: string, apiKey: string) {
  const url = `https://api.blockcypher.com/v1/btc/main/addrs/${address}/full?token=${apiKey}&limit=5`
  
  console.log('Making BTC API call to:', url.replace(apiKey, 'HIDDEN'))

  const response = await fetch(url)
  console.log('BTC API response status:', response.status)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const data = await response.json()
  console.log('BTC API response keys:', Object.keys(data))

  return {
    address: data.address,
    balance: data.balance,
    total_received: data.total_received,
    total_sent: data.total_sent,
    n_tx: data.n_tx,
    txs_count: data.txs ? data.txs.length : 0
  }
}