
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 1x1 transparent GIF pixel
const pixelGif = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00,
  0xFF, 0xFF, 0xFF, 0x21, 0xF9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2C, 0x00, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3B
]);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const trackingId = url.searchParams.get('id');

    if (!trackingId) {
      console.log("No tracking ID provided");
      return new Response(pixelGif, {
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          ...corsHeaders
        }
      });
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Log the email open event and increment counter
    const { data: existing, error: selectError } = await supabase
      .from('email_logs')
      .select('open_count, opened_at')
      .eq('tracking_code', trackingId)
      .maybeSingle();

    if (selectError) {
      console.warn('Error fetching existing log for tracking:', trackingId, selectError);
    }

    const newCount = (existing?.open_count ?? 0) + 1;
    const openedAt = existing?.opened_at || new Date().toISOString();

    const { error: updateError } = await supabase
      .from('email_logs')
      .update({
        opened_at: openedAt,
        open_count: newCount
      })
      .eq('tracking_code', trackingId);

    if (updateError) {
      console.error('Error logging email open:', updateError);
    } else {
      console.log('Email open tracked for:', trackingId, 'count:', newCount);
    }

    // Return 1x1 transparent GIF
    return new Response(pixelGif, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        ...corsHeaders
      }
    });

  } catch (error: any) {
    console.error("Error in track-email-open function:", error);
    
    // Always return the pixel even if there's an error
    return new Response(pixelGif, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        ...corsHeaders
      }
    });
  }
};

serve(handler);
