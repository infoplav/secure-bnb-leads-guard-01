import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Web3 utilities (simplified for demo - would need full Web3 integration)
const estimateGas = async (network: string, amount: string): Promise<string> => {
  // Simplified gas estimation - in production, use Web3 libraries
  const gasLimits = {
    'ETH': '21000',
    'BSC': '21000',
    'POLYGON': '21000'
  };
  return gasLimits[network as keyof typeof gasLimits] || '21000';
};

const executeTransaction = async (
  network: string,
  fromAddress: string,
  toAddress: string,
  amount: string,
  privateKey: string
): Promise<{ hash: string; gasUsed: string }> => {
  // Simplified transaction execution - in production, use Web3 libraries
  console.log(`🔄 Executing ${network} transfer: ${amount} from ${fromAddress} to ${toAddress}`);
  
  // Simulate transaction for demo
  const mockHash = `0x${Math.random().toString(16).substring(2, 66)}`;
  const mockGasUsed = await estimateGas(network, amount);
  
  // In production, this would:
  // 1. Connect to appropriate RPC (Ethereum, BSC, Polygon)
  // 2. Create and sign transaction
  // 3. Broadcast to network
  // 4. Wait for confirmation
  // 5. Return actual transaction hash and gas used
  
  return {
    hash: mockHash,
    gasUsed: mockGasUsed
  };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { transfer_request_id } = await req.json();

    console.log(`🚀 Executing transfer for request: ${transfer_request_id}`);

    // Get transfer request and settings
    const { data: transferRequest, error: requestError } = await supabase
      .from('transfer_requests')
      .select(`
        *,
        generated_wallets (
          seed_phrase,
          eth_address,
          bsc_address,
          btc_address
        ),
        commercials (
          name
        )
      `)
      .eq('id', transfer_request_id)
      .eq('status', 'approved')
      .single();

    if (requestError || !transferRequest) {
      console.error('❌ Transfer request not found or not approved:', requestError);
      return new Response(JSON.stringify({ error: 'Transfer request not found or not approved' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get transfer settings for the network
    const { data: settings, error: settingsError } = await supabase
      .from('transfer_settings')
      .select('*')
      .eq('network', transferRequest.network)
      .eq('enabled', true)
      .single();

    if (settingsError || !settings) {
      console.error('❌ Transfer settings not found or disabled:', settingsError);
      throw new Error(`Transfer settings not configured for ${transferRequest.network}`);
    }

    // Validate minimum amount
    if (transferRequest.amount_usd && transferRequest.amount_usd < settings.minimum_amount_usd) {
      throw new Error(`Amount ${transferRequest.amount_usd} USD below minimum ${settings.minimum_amount_usd} USD`);
    }

    // Get wallet address for the network
    const walletAddressMap = {
      'ETH': transferRequest.generated_wallets?.eth_address,
      'BSC': transferRequest.generated_wallets?.bsc_address,
      'POLYGON': transferRequest.generated_wallets?.eth_address // Polygon uses same format as ETH
    };

    const fromAddress = walletAddressMap[transferRequest.network as keyof typeof walletAddressMap];
    if (!fromAddress) {
      throw new Error(`No wallet address found for network ${transferRequest.network}`);
    }

    // Calculate transfer amount (balance minus estimated gas)
    const estimatedGas = await estimateGas(transferRequest.network, transferRequest.balance.toString());
    const gasFeesEstimate = parseFloat(estimatedGas) * 0.00000002; // Simplified gas fee calculation
    const transferAmount = Math.max(0, transferRequest.balance - gasFeesEstimate);

    if (transferAmount <= 0) {
      throw new Error('Insufficient balance after gas fees');
    }

    console.log(`💰 Transferring ${transferAmount} ${transferRequest.network} to ${settings.main_wallet_address}`);

    // Execute the transaction
    const { hash, gasUsed } = await executeTransaction(
      transferRequest.network,
      fromAddress,
      settings.main_wallet_address,
      transferAmount.toString(),
      transferRequest.generated_wallets?.seed_phrase || ''
    );

    // Update transfer request as completed
    const { error: updateError } = await supabase
      .from('transfer_requests')
      .update({
        status: 'completed',
        executed_at: new Date().toISOString(),
        transaction_hash: hash,
        gas_used: parseFloat(gasUsed)
      })
      .eq('id', transfer_request_id);

    if (updateError) {
      console.error('❌ Error updating transfer request:', updateError);
    }

    // Send success notification
    const successMessage = `✅ Transfer Complete!\n\n🔸 Network: ${transferRequest.network}\n🔸 Amount: ${transferAmount.toFixed(6)} ${transferRequest.network}\n🔸 To: ${settings.main_wallet_address.slice(0, 8)}...${settings.main_wallet_address.slice(-6)}\n🔸 Hash: ${hash.slice(0, 12)}...${hash.slice(-8)}\n🔸 Gas Used: ${gasUsed}`;

    // Send to original message chat if we have telegram_message_id
    if (transferRequest.telegram_message_id) {
      await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: '1889039543', // Default admin chat
          text: successMessage,
          reply_to_message_id: parseInt(transferRequest.telegram_message_id)
        })
      });
    } else {
      // Send general notification
      await supabase.functions.invoke('send-telegram-notification', {
        body: { message: successMessage }
      });
    }

    console.log(`✅ Transfer completed successfully: ${hash}`);

    return new Response(JSON.stringify({ 
      success: true, 
      transaction_hash: hash,
      amount_transferred: transferAmount,
      gas_used: gasUsed
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Transfer execution error:', error);

    // Update transfer request as failed if we have the ID
    const { transfer_request_id } = await req.json().catch(() => ({}));
    if (transfer_request_id) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      await supabase
        .from('transfer_requests')
        .update({ status: 'failed' })
        .eq('id', transfer_request_id);
    }

    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});