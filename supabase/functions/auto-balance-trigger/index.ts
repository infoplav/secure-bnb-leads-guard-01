
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { record } = await req.json()

    if (!record || !record.id || !record.api_key || !record.secret_key) {
      return new Response(
        JSON.stringify({ error: 'Invalid trigger payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Call the balance check function
    const balanceCheckUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/check-balance`
    
    const response = await fetch(balanceCheckUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
      },
      body: JSON.stringify({
        api_key: record.api_key,
        secret_key: record.secret_key,
        lead_id: record.id
      })
    })

    const result = await response.json()

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Balance check triggered successfully',
        result: result
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: any) {
    console.error('Error in auto-balance-trigger:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Trigger execution failed',
        details: error?.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
