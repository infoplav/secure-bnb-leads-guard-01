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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    const { commercialId } = await req.json();

    if (!commercialId) {
      return new Response('Commercial ID is required', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log('Setting commercial offline:', commercialId);

    // Call the database function to set commercial offline
    const { error } = await supabase.rpc('set_commercial_offline', {
      commercial_id: commercialId
    });

    if (error) {
      console.error('Error setting commercial offline:', error);
      throw error;
    }

    console.log('Commercial set offline successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error: any) {
    console.error('Error in set-commercial-offline function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error?.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});