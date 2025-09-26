import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Processing wallet address generation queue...");

    // Get pending address generation tasks
    const { data: tasks, error: fetchError } = await supabase
      .from('admin_settings')
      .select('*')
      .like('setting_key', 'gen_addr_%');

    if (fetchError) {
      console.error('Error fetching tasks:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${tasks?.length || 0} address generation tasks`);

    let processed = 0;
    let errors = 0;

    for (const task of tasks || []) {
      try {
        const taskData = JSON.parse(task.setting_value);
        console.log(`Processing task for wallet ${taskData.wallet_id}`);

        // Call the generate-wallet-addresses function
        const { data: result, error: genError } = await supabase.functions.invoke('generate-wallet-addresses', {
          body: {
            wallet_id: taskData.wallet_id,
            seed_phrase: taskData.seed_phrase,
            commercial_id: taskData.commercial_id
          }
        });

        if (genError) {
          console.error(`Error generating addresses for wallet ${taskData.wallet_id}:`, genError);
          errors++;
        } else if (result?.success) {
          console.log(`Successfully generated addresses for wallet ${taskData.wallet_id}`);
          processed++;

          // Remove the processed task
          await supabase
            .from('admin_settings')
            .delete()
            .eq('id', task.id);
        } else {
          console.error(`Address generation failed for wallet ${taskData.wallet_id}:`, result);
          errors++;
        }
        
        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Error processing task ${task.id}:`, error);
        errors++;
      }
    }

    console.log(`Address generation processing complete. Processed: ${processed}, Errors: ${errors}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processed} wallet address generations, ${errors} errors`,
        processed,
        errors
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (e: any) {
    console.error('Function error:', e);
    return new Response(
      JSON.stringify({ success: false, error: e?.message || "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});