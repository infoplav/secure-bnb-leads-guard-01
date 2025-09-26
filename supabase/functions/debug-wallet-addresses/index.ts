import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// NOTE: This debug function was simplified to avoid unsupported npm dependencies in the runtime.
// It returns a helpful message instead of attempting on-the-fly cryptographic address derivation.
// If you need full debug address generation, implement it in a secure backend environment with proper deps.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const bodyText = await req.text();
    console.log("debug-wallet-addresses called. Body:", bodyText);

    return new Response(
      JSON.stringify({
        success: false,
        message:
          "This debug endpoint is disabled in this environment (npm deps not available).",
        hint:
          "For address derivation, use the main wallet generation flow or run locally with proper deps.",
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
