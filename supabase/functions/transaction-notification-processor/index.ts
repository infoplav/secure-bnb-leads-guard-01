import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

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
    console.log('Processing transaction notifications...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!telegramBotToken) {
      console.error('Missing Telegram bot token');
      return new Response(
        JSON.stringify({ error: 'Missing Telegram bot token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch transaction notifications
    const { data: notifications, error: fetchError } = await supabase
      .from('admin_settings')
      .select('*')
      .like('setting_key', 'transaction_found_%');

    if (fetchError) {
      console.error('Error fetching notifications:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch notifications' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${notifications?.length || 0} transaction notifications to process`);

    let processedCount = 0;

    for (const notification of notifications || []) {
      try {
        // Parse notification data
        const notificationData = JSON.parse(notification.setting_value);
        
        // Send admin notification
        const adminMessage = `🚨 <b>New ${notificationData.network} Transaction Detected!</b>

💰 <b>Amount:</b> ${notificationData.amount} ${notificationData.token_symbol}
💵 <b>USD Value:</b> $${notificationData.usd_value}
🏦 <b>From:</b> ${notificationData.from_address}
📥 <b>To:</b> ${notificationData.wallet_address} 
🔗 <b>Hash:</b> ${notificationData.transaction_hash}
⛓️ <b>Network:</b> ${notificationData.network}
👤 <b>Commercial:</b> ${notificationData.commercial_name}

Transaction added to wallet monitoring system.`;

        // Send to admin Telegram
        await supabase.functions.invoke('send-telegram-notification', {
          body: {
            message: adminMessage,
            chat_ids: ['1889039543', '5433409472'] // Admin chat IDs
          }
        });

        // Send to commercial if they have Telegram ID
        if (notificationData.commercial_telegram_id) {
          const commercialMsg = `💰 <b>Transaction Alert!</b>

You received ${notificationData.amount} ${notificationData.token_symbol} (≈ $${notificationData.usd_value})
🔗 Hash: ${notificationData.transaction_hash}
⛓️ Network: ${notificationData.network}

Your earnings have been updated!`;

          try {
            const tgRes = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: notificationData.commercial_telegram_id,
                text: commercialMsg,
                parse_mode: 'HTML'
              })
            });

            if (tgRes.ok) {
              console.log(`Transaction notification sent to commercial ${notificationData.commercial_id}`);
              
              // Update notification status in wallet_transactions
              await supabase
                .from('wallet_transactions')
                .update({ notification_sent: true })
                .eq('transaction_hash', notificationData.transaction_hash);
            } else {
              console.error(`Failed to send transaction notification to commercial ${notificationData.commercial_id}`);
            }
          } catch (commercialError) {
            console.warn('Could not send transaction notification to commercial:', commercialError);
          }
        }

        // Remove processed notification
        await supabase
          .from('admin_settings')
          .delete()
          .eq('id', notification.id);

        processedCount++;
        console.log(`Processed transaction notification: ${notificationData.transaction_hash}`);

      } catch (processError) {
        console.error(`Error processing notification ${notification.id}:`, processError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedCount,
        message: `Processed ${processedCount} transaction notifications`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in transaction notification processor function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});