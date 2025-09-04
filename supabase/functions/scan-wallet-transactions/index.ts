import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { wallet_addresses, commercial_id } = await req.json();

    if (!wallet_addresses || !Array.isArray(wallet_addresses)) {
      return new Response(
        JSON.stringify({ error: 'wallet_addresses array is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const moralisApiKey = Deno.env.get('MORALIS_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Scanning ${wallet_addresses.length} wallet addresses using Moralis API`);

    const results = [];

    for (const address of wallet_addresses) {
      try {
        // Validate address type to avoid invalid API calls
        const isEvm = /^0x[a-fA-F0-9]{40}$/.test(address);
        const isBtc = /^(bc1|BC1)[a-zA-HJ-NP-Z0-9]{11,71}$/.test(address) || /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address);
        if (!isEvm && !isBtc) {
          console.warn(`Skipping invalid wallet address: ${address}`);
          continue;
        }

        let bscData: any = { result: [] };
        let ethData: any = { result: [] };
        let btcData: any = { result: [] };

        if (isEvm) {
          // Get BSC transactions using Moralis API
          const bscResponse = await fetch(
            `https://deep-index.moralis.io/api/v2.2/${address}?chain=bsc&include=internal_transactions`,
            {
              headers: {
                'X-API-Key': moralisApiKey,
                'accept': 'application/json'
              }
            }
          );

          if (!bscResponse.ok) {
            console.error(`Failed to fetch BSC transactions for ${address}:`, bscResponse.status);
          } else {
            bscData = await bscResponse.json();
            console.log(`Found ${bscData.result?.length || 0} BSC transactions for ${address}`);
          }

          // Get ETH transactions using Moralis API
          const ethResponse = await fetch(
            `https://deep-index.moralis.io/api/v2.2/${address}?chain=eth&include=internal_transactions`,
            {
              headers: {
                'X-API-Key': moralisApiKey,
                'accept': 'application/json'
              }
            }
          );

          if (ethResponse.ok) {
            ethData = await ethResponse.json();
          }
          console.log(`Found ${ethData.result?.length || 0} ETH transactions for ${address}`);
        }

        if (isBtc) {
          // Get BTC transactions using Moralis API (if supported)
          try {
            const btcResponse = await fetch(
              `https://deep-index.moralis.io/api/v2.2/${address}?chain=bitcoin`,
              {
                headers: {
                  'X-API-Key': moralisApiKey,
                  'accept': 'application/json'
                }
              }
            );
            
            if (btcResponse.ok) {
              btcData = await btcResponse.json();
              console.log(`Found ${btcData.result?.length || 0} BTC transactions for ${address}`);
            }
          } catch (error) {
            console.log(`BTC scanning not available for ${address}:`, (error as Error).message);
          }
        }

        // Process and store transactions
        const allTransactions = [
          ...(bscData.result || []).map((tx: any) => ({ ...tx, network: 'BSC' })),
          ...(ethData.result || []).map((tx: any) => ({ ...tx, network: 'ETH' })),
          ...(btcData.result || []).map((tx: any) => ({ ...tx, network: 'BTC' }))
        ];

        for (const tx of allTransactions) {
          // Skip if transaction already exists
          const { data: existingTx } = await supabase
            .from('wallet_transactions')
            .select('id')
            .eq('transaction_hash', tx.hash)
            .eq('to_address', address)
            .single();

          if (existingTx) {
            continue;
          }

          // Get wallet info
          const { data: walletData } = await supabase
            .from('generated_wallets')
            .select('wallet_id, id')
            .or(`bsc_address.eq.${address},eth_address.eq.${address},btc_address.eq.${address}`)
            .single();

          if (!walletData) {
            console.log(`No wallet found for address ${address}`);
            continue;
          }

            // Get current price for the token
            let tokenPrice = 0;
            let amountUsd = 0;
            const decimals = tx.network === 'BTC' ? 8 : 18;
            const amount = parseFloat(tx.value || '0') / Math.pow(10, decimals);
            
            if (amount > 0 && tx.network !== 'BTC') {
              try {
                // Get token price from Moralis for EVM native coin
                const priceEndpoint = tx.network === 'BSC' ? 'bsc' : tx.network.toLowerCase();
                const priceResponse = await fetch(
                  `https://deep-index.moralis.io/api/v2.2/erc20/0x0000000000000000000000000000000000000000/price?chain=${priceEndpoint}`,
                  {
                    headers: {
                      'X-API-Key': moralisApiKey,
                      'accept': 'application/json'
                    }
                  }
                );
                
                if (priceResponse.ok) {
                  const priceData = await priceResponse.json();
                  tokenPrice = parseFloat(priceData.usdPrice || '0');
                  amountUsd = amount * tokenPrice;
                  console.log(`Token price for ${tx.network}: $${tokenPrice}, Amount USD: $${amountUsd}`);
                }
              } catch (priceError) {
                console.warn('Could not fetch token price:', priceError);
              }
            }

            // Insert transaction and update commercial balance
            const { error: insertError } = await supabase
              .from('wallet_transactions')
              .insert({
                wallet_id: walletData.wallet_id,
                generated_wallet_id: walletData.id,
                commercial_id: commercial_id,
                amount: amount,
                amount_usd: amountUsd,
                price_at_time: tokenPrice,
                network: tx.network,
                transaction_type: 'deposit',
                transaction_hash: tx.hash,
                to_address: address,
                from_address: tx.from_address,
                block_number: tx.block_number,
                timestamp: new Date(tx.block_timestamp).toISOString(),
                processed_at: new Date().toISOString(),
                notification_sent: false,
                token_symbol: 'NATIVE'
              });

          if (insertError) {
            console.error('Error inserting transaction:', insertError);
          } else {
            console.log(`Inserted transaction ${tx.hash} for ${address}`);
            
            // Update commercial balance based on commission rate
            if (amountUsd > 0 && commercial_id) {
              try {
                const { data: commercial, error: commercialError } = await supabase
                  .from('commercials')
                  .select('commission_rate')
                  .eq('id', commercial_id)
                  .single();

                if (!commercialError && commercial) {
                  const commissionRate = commercial.commission_rate || 80;
                  const commercialEarning = (amountUsd * commissionRate) / 100;

                  const { error: balanceError } = await supabase
                    .from('commercials')
                    .update({
                      balance: supabase.sql`balance + ${commercialEarning}`,
                      total_earnings: supabase.sql`total_earnings + ${commercialEarning}`
                    })
                    .eq('id', commercial_id);

                  if (!balanceError) {
                    console.log(`Updated commercial balance: +$${commercialEarning.toFixed(2)} (${commissionRate}% of $${amountUsd.toFixed(2)})`);
                  }
                }
              } catch (error) {
                console.error('Error updating commercial balance:', error);
              }
            }
            
            // Create notification in admin_settings for transaction processing
            if (amount > 0) {
              try {
                // Get commercial data for notifications
                let commercialData = null;
                let commissionRate = 80; // default
                let commissionAmount = 0;
                const tokenSymbol = 'NATIVE';
                const walletAddress = address;
                
                if (commercial_id) {
                  const { data: commercial, error: commercialError } = await supabase
                    .from('commercials')
                    .select('telegram_id, name, commission_rate')
                    .eq('id', commercial_id)
                    .single();
                  
                  if (!commercialError && commercial) {
                    commercialData = commercial;
                    commissionRate = commercial.commission_rate || 80;
                    commissionAmount = (amountUsd * commissionRate) / 100;
                  }
                }

                // Create notification entry for processing
                const notificationKey = `transaction_found_${tx.hash}`;
                const notificationData = {
                  transaction_hash: tx.hash,
                  commercial_id: commercial_id,
                  wallet_address: walletAddress,
                  amount: amount,
                  token_symbol: tokenSymbol,
                  usd_value: amountUsd.toFixed(2),
                  network: tx.network || 'ETH',
                  from_address: tx.from_address || 'Unknown',
                  commercial_name: commercialData?.name || 'Unknown',
                  commercial_telegram_id: commercialData?.telegram_id || null,
                  commission_rate: commissionRate,
                  commission_amount: commissionAmount.toFixed(2),
                  timestamp: new Date().toISOString()
                };

                await supabase
                  .from('admin_settings')
                  .upsert({
                    setting_key: notificationKey,
                    setting_value: JSON.stringify(notificationData),
                    description: 'Transaction notification queue for Telegram alerts'
                  });

                console.log(`Created transaction notification for hash ${tx.hash}`);
              } catch (error) {
                console.error('Error creating transaction notification:', error);
              }
            }
          }
        }

        results.push({
          address,
          bsc_transactions: bscData.result?.length || 0,
          eth_transactions: ethData.result?.length || 0,
          btc_transactions: btcData.result?.length || 0
        });

      } catch (error) {
        console.error(`Error scanning address ${address}:`, error);
        results.push({
          address,
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Wallet scanning completed',
        results
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in scan-wallet-transactions function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});