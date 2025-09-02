import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { commercial_id, amount, reason = "Withdrawal request" } = await req.json();

    console.log(`Processing withdrawal request for commercial ${commercial_id}: $${amount}`);

    // Get commercial info
    const { data: commercial, error: commercialError } = await supabase
      .from('commercials')
      .select('name, balance, telegram_id')
      .eq('id', commercial_id)
      .single();

    if (commercialError || !commercial) {
      throw new Error('Commercial not found');
    }

    if (commercial.balance < amount) {
      return new Response(
        JSON.stringify({ error: 'Insufficient balance' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create withdrawal record in admin_settings for tracking
    const withdrawalData = {
      commercial_id,
      commercial_name: commercial.name,
      amount,
      reason,
      current_balance: commercial.balance,
      telegram_id: commercial.telegram_id,
      timestamp: new Date().toISOString()
    };

    const { error: settingError } = await supabase
      .from('admin_settings')
      .upsert({
        setting_key: `withdrawal_request_${commercial_id}_${Date.now()}`,
        setting_value: JSON.stringify(withdrawalData),
        description: `Withdrawal request from ${commercial.name}`
      });

    if (settingError) {
      console.error('Error saving withdrawal request:', settingError);
    }

    // Send Telegram notification to admins (IDs 1889039543 and 5433409472)
    const adminIds = [1889039543, 5433409472];
    const message = `💰 Nouvelle Demande de Retrait!
👤 Commercial: ${commercial.name}
💵 Montant: $${amount.toFixed(2)}
💼 Solde actuel: $${commercial.balance.toFixed(2)}
📝 Raison: ${reason}
🕒 Date: ${new Date().toLocaleString('fr-FR')}`;

    for (const adminId of adminIds) {
      try {
        const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: adminId,
            text: message,
            parse_mode: 'HTML'
          }),
        });

        if (response.ok) {
          console.log(`Withdrawal notification sent to admin ${adminId}`);
        } else {
          console.warn(`Failed to send withdrawal notification to admin ${adminId}`);
        }
      } catch (error) {
        console.error(`Error sending notification to admin ${adminId}:`, error);
      }
    }

    // Send confirmation to commercial if they have telegram_id
    if (commercial.telegram_id) {
      const confirmationMessage = `✅ Demande de Retrait Envoyée!
💵 Montant: $${amount.toFixed(2)}
📝 Votre demande a été transmise aux administrateurs.
⏰ Vous recevrez une confirmation sous 24h.`;

      try {
        await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: commercial.telegram_id,
            text: confirmationMessage,
            parse_mode: 'HTML'
          }),
        });
        console.log(`Withdrawal confirmation sent to commercial ${commercial.name}`);
      } catch (error) {
        console.error('Error sending confirmation to commercial:', error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Withdrawal request submitted successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in withdrawal-request function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});