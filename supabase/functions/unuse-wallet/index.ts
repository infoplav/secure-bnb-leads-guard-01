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
    const { wallet_id } = await req.json();

    if (!wallet_id) {
      return new Response(
        JSON.stringify({ error: 'wallet_id is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Attempting to unuse wallet: ${wallet_id}`);

    // First check if wallet exists and is currently used
    const { data: existingWallet, error: fetchError } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', wallet_id)
      .single();

    if (fetchError) {
      console.error('Error fetching wallet:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Wallet not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (existingWallet.status === 'available') {
      console.log(`Wallet ${wallet_id} is already available`);
      return new Response(
        JSON.stringify({ message: 'Wallet is already available', wallet: existingWallet }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Reset wallet to available state
    const { data: updatedWallet, error: updateError } = await supabase
      .from('wallets')
      .update({
        status: 'available',
        used_by_commercial_id: null,
        used_at: null,
        client_tracking_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', wallet_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating wallet:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to unuse wallet' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Successfully made wallet available: ${wallet_id}`);

    // Send Telegram notification about wallet being made available
    try {
      await supabase.functions.invoke('send-telegram-notification', {
        body: {
          message: `🔄 Wallet made available again!\nWallet ID: ${wallet_id}\nPhrase: ${existingWallet.phrase}`
        }
      });
    } catch (error) {
      console.error('Error sending Telegram notification:', error);
    }

    return new Response(
      JSON.stringify({ 
        message: 'Wallet successfully made available',
        wallet: updatedWallet
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in unuse-wallet function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});