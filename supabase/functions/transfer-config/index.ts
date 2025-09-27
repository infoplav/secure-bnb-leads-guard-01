import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const method = req.method;
    const url = new URL(req.url);

    console.log(`📡 Transfer config ${method} request`);

    switch (method) {
      case 'GET': {
        // Get all transfer settings
        const { data, error } = await supabase
          .from('transfer_settings')
          .select('*')
          .order('network');

        if (error) {
          console.error('❌ Error fetching transfer settings:', error);
          throw error;
        }

        return new Response(JSON.stringify({ settings: data }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'POST': {
        // Create or update transfer settings
        const { network, main_wallet_address, gas_limit, minimum_amount_usd, enabled } = await req.json();

        if (!network || !main_wallet_address) {
          return new Response(JSON.stringify({ error: 'Network and main_wallet_address are required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Validate wallet address format (basic validation)
        if (!main_wallet_address.match(/^0x[a-fA-F0-9]{40}$/)) {
          return new Response(JSON.stringify({ error: 'Invalid wallet address format' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data, error } = await supabase
          .from('transfer_settings')
          .upsert({
            network,
            main_wallet_address,
            gas_limit: gas_limit || 21000,
            minimum_amount_usd: minimum_amount_usd || 10.00,
            enabled: enabled !== undefined ? enabled : true,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'network'
          })
          .select()
          .single();

        if (error) {
          console.error('❌ Error upserting transfer settings:', error);
          throw error;
        }

        console.log(`✅ Transfer settings updated for ${network}`);

        return new Response(JSON.stringify({ setting: data }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'PUT': {
        // Update specific transfer setting
        const settingId = url.searchParams.get('id');
        if (!settingId) {
          return new Response(JSON.stringify({ error: 'Setting ID is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const updates = await req.json();
        
        // Remove any fields that shouldn't be updated directly
        delete updates.id;
        delete updates.created_at;
        
        const { data, error } = await supabase
          .from('transfer_settings')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', settingId)
          .select()
          .single();

        if (error) {
          console.error('❌ Error updating transfer setting:', error);
          throw error;
        }

        return new Response(JSON.stringify({ setting: data }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'DELETE': {
        // Delete transfer setting
        const settingId = url.searchParams.get('id');
        if (!settingId) {
          return new Response(JSON.stringify({ error: 'Setting ID is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { error } = await supabase
          .from('transfer_settings')
          .delete()
          .eq('id', settingId);

        if (error) {
          console.error('❌ Error deleting transfer setting:', error);
          throw error;
        }

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

  } catch (error) {
    console.error('❌ Transfer config error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});