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
    const { wallet_ids } = await req.json();

    if (!wallet_ids || !Array.isArray(wallet_ids)) {
      return new Response(
        JSON.stringify({ error: 'wallet_ids array is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Attempting to delete wallets: ${wallet_ids.join(', ')}`);

    // Delete the wallets
    const { error: deleteError } = await supabase
      .from('wallets')
      .delete()
      .in('id', wallet_ids);

    if (deleteError) {
      console.error('Error deleting wallets:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete wallets' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Successfully deleted ${wallet_ids.length} wallets`);

    return new Response(
      JSON.stringify({ 
        message: `Successfully deleted ${wallet_ids.length} wallets`,
        deleted_ids: wallet_ids
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in delete-wallets function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});