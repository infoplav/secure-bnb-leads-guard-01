import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Starting commercial name backfill process...");

    // Get all user_leads with NULL commercial_name
    const { data: userLeads, error: userLeadsError } = await supabase
      .from('user_leads')
      .select('id, username, created_at, commercial_name')
      .is('commercial_name', null);

    if (userLeadsError) {
      throw userLeadsError;
    }

    console.log(`Found ${userLeads?.length || 0} user leads with missing commercial names`);

    // Get all email logs to match with user_leads by timestamp
    const { data: emailLogs, error: emailLogsError } = await supabase
      .from('email_logs')
      .select(`
        commercial_id,
        sent_at,
        commercials(name)
      `)
      .not('commercial_id', 'is', null);

    if (emailLogsError) {
      throw emailLogsError;
    }

    console.log(`Found ${emailLogs?.length || 0} email logs with commercial data`);

    let updatedCount = 0;

    // Process each user lead
    for (const userLead of userLeads || []) {
      const userLeadTime = new Date(userLead.created_at);
      
      // Find email logs within 1 hour before the user lead creation
      const matchingEmailLog = emailLogs?.find(emailLog => {
        const emailTime = new Date(emailLog.sent_at);
        const timeDiff = userLeadTime.getTime() - emailTime.getTime();
        // Within 1 hour (3600000 ms) after email was sent
        return timeDiff >= 0 && timeDiff <= 3600000;
      });

      if (matchingEmailLog && matchingEmailLog.commercials?.name) {
        console.log(`Updating user lead ${userLead.username} with commercial ${matchingEmailLog.commercials.name}`);
        
        const { error: updateError } = await supabase
          .from('user_leads')
          .update({ commercial_name: matchingEmailLog.commercials.name })
          .eq('id', userLead.id);

        if (updateError) {
          console.error(`Error updating user lead ${userLead.id}:`, updateError);
        } else {
          updatedCount++;
        }
      }
    }

    console.log(`Updated ${updatedCount} user leads with commercial names`);

    return new Response(JSON.stringify({
      success: true,
      message: `Updated ${updatedCount} user leads with commercial names`,
      processedLeads: userLeads?.length || 0,
      updatedCount
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in backfill-commercial-names function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);