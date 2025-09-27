import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting wallet email sync...');

    // Find wallets where client_tracking_id is missing but we have email logs
    const { data: emailLogs, error: emailError } = await supabase
      .from('email_logs')
      .select(`
        recipient_email,
        commercial_id,
        sent_at
      `)
      .not('recipient_email', 'is', null)
      .order('sent_at', { ascending: false });

    if (emailError) {
      throw emailError;
    }

    console.log(`Found ${emailLogs.length} email logs to process`);

    let syncedCount = 0;
    const processedEmails = new Set();

    // Process each unique email-commercial combination
    for (const log of emailLogs) {
      const key = `${log.recipient_email}_${log.commercial_id}`;
      if (processedEmails.has(key)) continue;
      processedEmails.add(key);

      // Find wallets for this commercial with missing client_tracking_id
      const { data: wallets, error: walletError } = await supabase
        .from('wallets')
        .select('id, client_tracking_id')
        .eq('used_by_commercial_id', log.commercial_id)
        .is('client_tracking_id', null);

      if (walletError || !wallets.length) continue;

      // Update the most recently used wallet with this email
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ client_tracking_id: log.recipient_email })
        .eq('id', wallets[0].id);

      if (!updateError) {
        console.log(`Synced email ${log.recipient_email} to wallet ${wallets[0].id}`);
        syncedCount++;
      }
    }

    console.log(`Sync completed: ${syncedCount} wallets updated`);

    return new Response(JSON.stringify({ 
      success: true, 
      synced: syncedCount,
      message: `Successfully synced ${syncedCount} wallet emails`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in sync-wallet-emails function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error?.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});