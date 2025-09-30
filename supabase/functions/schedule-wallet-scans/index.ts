import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { generated_wallet_id } = await req.json()

    if (!generated_wallet_id) {
      return new Response(JSON.stringify({ error: 'generated_wallet_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log(`📅 Creating scan schedule for wallet ${generated_wallet_id}`)

    const now = new Date()
    
    // Schedule: 5min, 10min, 30min, then hourly (1h, 2h, 3h, 4h, 5h)
    const schedules = [
      { minutes: 5, scan_number: 1 },
      { minutes: 10, scan_number: 2 },
      { minutes: 30, scan_number: 3 },
      { minutes: 60, scan_number: 4 },
      { minutes: 120, scan_number: 5 },
      { minutes: 180, scan_number: 6 },
      { minutes: 240, scan_number: 7 },
      { minutes: 300, scan_number: 8 },
    ]

    const scheduledScans = schedules.map(s => ({
      generated_wallet_id,
      scan_number: s.scan_number,
      scheduled_at: new Date(now.getTime() + s.minutes * 60 * 1000).toISOString(),
      status: 'pending'
    }))

    const { error: insertError } = await supabase
      .from('wallet_scan_schedule')
      .insert(scheduledScans)

    if (insertError) {
      console.error('❌ Error creating scan schedule:', insertError)
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`✅ Created ${schedules.length} scheduled scans for wallet ${generated_wallet_id}`)

    return new Response(JSON.stringify({
      success: true,
      scheduled_scans: schedules.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('❌ Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
