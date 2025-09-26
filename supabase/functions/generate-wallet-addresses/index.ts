import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Stubbed to avoid npm crypto dependencies in this environment.
// Original function generated ETH/BTC/BSC addresses from a seed phrase.

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("generate-wallet-addresses invoked (stub)");

    return new Response(
      JSON.stringify({
        success: false,
        message:
          "This function is disabled in this environment due to missing npm crypto dependencies.",
      }),
      { status: 501, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ success: false, error: e?.message || "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
