import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BounceEvent {
  type: string;
  data: {
    email_id: string;
    email: string;
    bounce_type: string;
    bounce_subtype: string;
    reason: string;
    timestamp: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const bounceEvent: BounceEvent = await req.json()
    
    console.log('Received bounce event:', bounceEvent)

    if (bounceEvent.type === 'email.bounced') {
      const { data, error } = await supabaseClient
        .from('email_logs')
        .update({
          bounce_count: 1,
          bounce_reason: bounceEvent.data.reason,
          bounce_at: new Date().toISOString(),
          status: 'bounced'
        })
        .eq('resend_id', bounceEvent.data.email_id)

      if (error) {
        console.error('Error updating bounce status:', error)
        throw error
      }

      console.log('Updated bounce status for email:', bounceEvent.data.email_id)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: any) {
    console.error('Error in handle-email-bounce function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error?.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})