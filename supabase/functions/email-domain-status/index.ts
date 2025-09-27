import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DomainStatus {
  domain: string;
  verified: boolean;
  dkim_verified: boolean;
  return_path_configured: boolean;
  api_key: string;
  error?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey1 = Deno.env.get('RESEND_API_KEY');
    const resendApiKey2 = Deno.env.get('RESEND_API_KEY_DOMAIN2');

    if (!resendApiKey1) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const domainsToCheck = [
      { domain: 'mailersrp-1binance.com', apiKey: resendApiKey1, name: 'domain1' },
      { domain: 'mailersrp-2binance.com', apiKey: resendApiKey2 || resendApiKey1, name: 'domain2' }
    ];

    const statuses: DomainStatus[] = [];

    for (const domainConfig of domainsToCheck) {
      try {
        console.log(`Checking domain ${domainConfig.domain} with API key`);
        
        const response = await fetch('https://api.resend.com/domains', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${domainConfig.apiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Resend API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`Resend response for ${domainConfig.domain}:`, data);

        // Find the specific domain in the response
        const domain = data.data?.find((d: any) => d.name === domainConfig.domain);
        
        if (!domain) {
          statuses.push({
            domain: domainConfig.name,
            verified: false,
            dkim_verified: false,
            return_path_configured: false,
            api_key: domainConfig.apiKey.substring(0, 8) + '...',
            error: `Domain ${domainConfig.domain} not found in Resend account`
          });
          continue;
        }

        // Check domain verification and DKIM status
        const verified = domain.status === 'verified';
        const dkimVerified = domain.records?.some((record: any) => 
          record.record === 'DKIM' && record.status === 'verified'
        ) || false;
        
        // Check for return-path/bounce configuration
        const returnPathConfigured = domain.records?.some((record: any) => 
          record.record === 'RETURN_PATH' && record.status === 'verified'
        ) || false;

        statuses.push({
          domain: domainConfig.name,
          verified,
          dkim_verified: dkimVerified,
          return_path_configured: returnPathConfigured,
          api_key: domainConfig.apiKey.substring(0, 8) + '...'
        });

      } catch (error) {
        console.error(`Error checking domain ${domainConfig.domain}:`, error);
        statuses.push({
          domain: domainConfig.name,
          verified: false,
          dkim_verified: false,
          return_path_configured: false,
          api_key: domainConfig.apiKey?.substring(0, 8) + '...' || 'N/A',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return new Response(JSON.stringify({ statuses }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('Error in email-domain-status function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);