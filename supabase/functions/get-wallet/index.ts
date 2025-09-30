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

    const { commercial_id, client_tracking_id } = await req.json();

    if (!commercial_id) {
      throw new Error('Commercial ID is required');
    }

    // Use email as the client tracking ID for direct email tracking
    const trackingEmail = client_tracking_id;
    const finalTrackingId = trackingEmail || `commercial_${commercial_id}_${Date.now()}`;
    
    console.log(`🔍 Get wallet request: commercial_id=${commercial_id}, client_email=${trackingEmail}`);

    // CRITICAL: Check if this email already has a wallet assigned
    if (trackingEmail) {
      const { data: existingWallet, error: checkError } = await supabase
        .from('wallets')
        .select('id, wallet_phrase, status, used_at')
        .eq('client_tracking_id', trackingEmail)
        .eq('status', 'used')
        .maybeSingle();

      if (existingWallet) {
        console.error(`❌ REUSE ATTEMPT BLOCKED: Email ${trackingEmail} already has wallet ${existingWallet.id} (used at ${existingWallet.used_at})`);
        throw new Error(`This email already has a wallet assigned. Wallet reuse is not allowed.`);
      }
    }

    console.log(`🎯 Attempting atomic wallet assignment for commercial ${commercial_id}, client email ${trackingEmail || 'unknown'}`);

    // ATOMIC OPERATION: Find and reserve wallet in a single query to prevent race conditions
    // This uses UPDATE with RETURNING to atomically select and mark a wallet as used
    const { data: availableWallet, error: walletError } = await supabase
      .from('wallets')
      .update({
        status: 'used',
        used_by_commercial_id: commercial_id,
        used_at: new Date().toISOString(),
        client_tracking_id: finalTrackingId
      })
      .eq('status', 'available')
      .is('used_by_commercial_id', null)
      .limit(1)
      .select('*')
      .single();

    if (walletError || !availableWallet) {
      console.error('❌ No available wallets found or atomic operation failed:', walletError);
      throw new Error('No available wallets found');
    }

    console.log(`✅ ATOMIC ASSIGNMENT SUCCESSFUL: Wallet ${availableWallet.id} assigned to commercial ${commercial_id}, email: ${finalTrackingId}`);

    // Generate cryptocurrency addresses for this wallet
    try {
      console.log(`Generating addresses for wallet ${availableWallet.id}`);
      
      const { data: addressData, error: addressError } = await supabase.functions.invoke('generate-wallet-addresses', {
        body: {
          wallet_id: availableWallet.id,
          seed_phrase: availableWallet.wallet_phrase,
          commercial_id: commercial_id
        }
      });

      if (addressError) {
        console.error('Error generating addresses:', addressError);
      } else if (addressData?.success) {
        console.log(`Successfully generated addresses for wallet ${availableWallet.id}`);
        
        // Create scheduled scans: 5min, 10min, 30min, hourly until 5h
        try {
          console.log(`📅 Creating scan schedule for wallet ${availableWallet.id}`);
          
          const { error: scheduleError } = await supabase.functions.invoke('schedule-wallet-scans', {
            body: {
              generated_wallet_id: addressData.data.id
            }
          });

          if (scheduleError) {
            console.error('⚠️ Failed to create scan schedule (non-critical):', scheduleError);
          } else {
            console.log(`✅ Scan schedule created for wallet ${availableWallet.id}`);
          }
        } catch (scheduleError) {
          console.error('⚠️ Schedule creation failed (non-critical):', scheduleError);
        }

        // Perform immediate first scan
        try {
          console.log(`🚀 Starting immediate first scan for wallet ${availableWallet.id}`);
          
          const { error: monitorError } = await supabase.functions.invoke('monitor-generated-wallet', {
            body: {
              wallet_id: availableWallet.id
            }
          });

          if (monitorError) {
            console.error('⚠️ Failed to start immediate scan (non-critical):', monitorError);
          } else {
            console.log(`✅ Immediate scan started for wallet ${availableWallet.id}`);
          }
        } catch (monitorError) {
          console.error('⚠️ Monitoring invocation failed (non-critical):', monitorError);
        }
      }
    } catch (addressGenError) {
      console.error('Address generation failed:', addressGenError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      wallet: availableWallet.wallet_phrase,
      wallet_id: availableWallet.id,
      reused: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in get-wallet function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error?.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});