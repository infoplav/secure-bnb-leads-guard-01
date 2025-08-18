
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

    const { api_key, secret_key, lead_id } = await req.json()

    if (!api_key || !secret_key || !lead_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get current server IP from config
    const { data: serverConfig } = await supabaseClient
      .from('server_config')
      .select('current_server_ip')
      .single()

    const currentServerIp = serverConfig?.current_server_ip || '127.0.0.1'
    console.log('Using server IP:', currentServerIp)

    // Create webhook payload
    const webhookPayload = {
      api_key: api_key,
      server_ip: currentServerIp
    }

    let balanceResult = {
      success: false,
      balance_usd: 0,
      message: '',
      error: null
    }

    try {
      // Call the new balance API
      const apiUrl = 'https://a5e4be64-e444-40c4-87f6-ded0387eac03.pub.instances.scw.cloud/api/check-balance.php'
      
      const apiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Supabase-Balance-Checker'
        },
        body: JSON.stringify({
          api_key: api_key,
          api_secret: secret_key,
          ip: currentServerIp
        })
      })

      const responseData = await apiResponse.json()

      if (apiResponse.ok && responseData.total_usd !== undefined) {
        balanceResult = {
          success: true,
          balance_usd: parseFloat(responseData.total_usd || '0'),
          message: 'Balance retrieved successfully',
          error: null
        }
      } else {
        // API returned an error
        balanceResult = {
          success: false,
          balance_usd: 0,
          message: 'API Error',
          error: responseData.error || `HTTP ${apiResponse.status}: ${apiResponse.statusText}`
        }
      }
    } catch (error) {
      console.error('Balance API call failed:', error)
      balanceResult = {
        success: false,
        balance_usd: 0,
        message: 'Network Error',
        error: `Connection failed: ${error.message}`
      }
    }

    // Update the lead's balance in the database
    const updateData = {
      updated_at: new Date().toISOString()
    }

    if (balanceResult.success) {
      updateData.balance = balanceResult.balance_usd
      updateData.balance_error = null // Clear any previous error
    } else {
      // Store error message in balance_error column
      updateData.balance_error = balanceResult.error
    }

    const { error: updateError } = await supabaseClient
      .from('user_leads')
      .update(updateData)
      .eq('id', lead_id)

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({
        success: balanceResult.success,
        balance_usd: balanceResult.balance_usd,
        message: balanceResult.message,
        error: balanceResult.error,
        server_ip_used: currentServerIp
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in check-balance function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
