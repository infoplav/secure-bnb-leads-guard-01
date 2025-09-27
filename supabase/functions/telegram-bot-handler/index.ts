import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      username?: string;
      first_name: string;
    };
    chat: {
      id: number;
    };
    text?: string;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      username?: string;
      first_name: string;
    };
    message: {
      message_id: number;
      chat: {
        id: number;
      };
    };
    data: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const update: TelegramUpdate = await req.json();
    console.log('📱 Received Telegram update:', JSON.stringify(update, null, 2));

    // Handle callback query (YES/NO button press)
    if (update.callback_query) {
      const { callback_query } = update;
      const chatId = callback_query.message.chat.id;
      const messageId = callback_query.message.message_id;
      const data = callback_query.data;

      console.log(`🔘 Callback query: ${data} from chat ${chatId}`);

      if (data.startsWith('transfer_')) {
        const [action, requestId] = data.split('_', 2);
        
        if (action === 'approve' || action === 'reject') {
          // Update transfer request status
          const { data: transferRequest, error: updateError } = await supabase
            .from('transfer_requests')
            .update({ 
              status: action === 'approve' ? 'approved' : 'rejected',
              approved_at: new Date().toISOString()
            })
            .eq('id', requestId)
            .eq('telegram_message_id', messageId.toString())
            .select()
            .single();

          if (updateError) {
            console.error('❌ Error updating transfer request:', updateError);
            return new Response(JSON.stringify({ error: 'Failed to update transfer request' }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // Answer callback query to remove loading state
          await fetch(`https://api.telegram.org/bot${telegramBotToken}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callback_query.id,
              text: action === 'approve' ? '✅ Transfer approved!' : '❌ Transfer rejected'
            })
          });

          if (action === 'approve') {
            console.log(`✅ Transfer ${requestId} approved, executing...`);
            
            // Execute the transfer
            const { error: executeError } = await supabase.functions.invoke('execute-transfer', {
              body: { transfer_request_id: requestId }
            });

            if (executeError) {
              console.error('❌ Error executing transfer:', executeError);
              
              // Update status to failed
              await supabase
                .from('transfer_requests')
                .update({ status: 'failed' })
                .eq('id', requestId);

              // Send failure message
              await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: `❌ Transfer failed: ${executeError.message}`,
                  reply_to_message_id: messageId
                })
              });
            }
          } else {
            // Send rejection confirmation
            await fetch(`https://api.telegram.org/bot${telegramBotToken}/editMessageText`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: `❌ Transfer rejected\n\nWallet: ${transferRequest.wallet_address}\nAmount: ${transferRequest.amount} ${transferRequest.network}\nStatus: REJECTED`
              })
            });
          }

          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
    }

    // Handle regular text messages (optional commands)
    if (update.message?.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text;

      console.log(`💬 Message: "${text}" from chat ${chatId}`);

      if (text === '/status') {
        // Get pending transfer requests
        const { data: pendingRequests, error } = await supabase
          .from('transfer_requests')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) {
          console.error('❌ Error fetching pending requests:', error);
          return new Response(JSON.stringify({ error: 'Database error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const statusMessage = pendingRequests.length > 0
          ? `📊 Pending Transfers: ${pendingRequests.length}\n\n` +
            pendingRequests.map(req => 
              `🔸 ${req.network}: ${req.amount} (${req.wallet_address.slice(0, 8)}...)`
            ).join('\n')
          : '✅ No pending transfers';

        await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: statusMessage
          })
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Telegram bot handler error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});