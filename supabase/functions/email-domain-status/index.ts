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
  dmarc_configured: boolean;
  dmarc_policy: string;
  api_key: string;
  error?: string;
  debug_records?: any[];
}

// Simple in-memory cache
const cache = new Map<string, { data: DomainStatus[], timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Rate limiting helpers
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const makeResendRequest = async (url: string, apiKey: string, retries = 3): Promise<Response> => {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 429) {
        const backoffDelay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Rate limited, waiting ${backoffDelay}ms before retry ${attempt + 1}/${retries}`);
        await sleep(backoffDelay);
        continue;
      }

      return response;
    } catch (error) {
      if (attempt === retries - 1) throw error;
      await sleep(1000 * (attempt + 1));
    }
  }
  throw new Error('Max retries exceeded');
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey1 = Deno.env.get('RESEND_API_KEY');
    const resendApiKey2 = Deno.env.get('RESEND_API_KEY_DOMAIN2');

    console.log('API Key 1 configured:', !!resendApiKey1, resendApiKey1?.substring(0, 8) + '...');
    console.log('API Key 2 configured:', !!resendApiKey2, resendApiKey2?.substring(0, 8) + '...');

    if (!resendApiKey1) {
      console.error('RESEND_API_KEY not configured');
      throw new Error('RESEND_API_KEY not configured');
    }

    // Validate API key format
    if (!resendApiKey1.startsWith('re_')) {
      console.error('Invalid RESEND_API_KEY format - should start with re_');
      throw new Error('Invalid RESEND_API_KEY format');
    }

    if (resendApiKey2 && !resendApiKey2.startsWith('re_')) {
      console.error('Invalid RESEND_API_KEY_DOMAIN2 format - should start with re_');
      throw new Error('Invalid RESEND_API_KEY_DOMAIN2 format');
    }

    const domainsToCheck = [
      { domain: 'mailersrp-1binance.com', apiKey: resendApiKey1, name: 'domain1' },
      { domain: 'mailersrp-2binance.com', apiKey: resendApiKey2 || resendApiKey1, name: 'domain2' }
    ];

    // Check cache first
    const cacheKey = `domain-status-${JSON.stringify(domainsToCheck.map(d => ({ domain: d.domain, key: d.apiKey.substring(0, 8) })))}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      console.log('Returning cached domain status data');
      return new Response(JSON.stringify({ statuses: cachedData.data }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    const statuses: DomainStatus[] = [];

    for (let i = 0; i < domainsToCheck.length; i++) {
      const domainConfig = domainsToCheck[i];
      
      try {
        console.log(`Checking domain ${domainConfig.domain} with API key (${i + 1}/${domainsToCheck.length})`);
        
        // Add delay between requests to respect rate limits (except for first request)
        if (i > 0) {
          console.log('Waiting 600ms between API calls to respect rate limits...');
          await sleep(600);
        }
        
        // Step 1: Get all domains to find the domain ID
        const listResponse = await makeResendRequest('https://api.resend.com/domains', domainConfig.apiKey);

        if (!listResponse.ok) {
          const errorText = await listResponse.text();
          console.error(`Resend API error for ${domainConfig.domain}:`, listResponse.status, listResponse.statusText, errorText);
          throw new Error(`Resend API error: ${listResponse.status} ${listResponse.statusText} - ${errorText}`);
        }

        const listData = await listResponse.json();
        console.log(`Resend domains list for ${domainConfig.domain}:`, listData);

        // Find the specific domain in the list response
        const domain = listData.data?.find((d: any) => d.name === domainConfig.domain);
        
        if (!domain) {
          statuses.push({
            domain: domainConfig.name,
            verified: false,
            dkim_verified: false,
            return_path_configured: false,
            dmarc_configured: false,
            dmarc_policy: 'none',
            api_key: domainConfig.apiKey.substring(0, 8) + '...',
            error: `Domain ${domainConfig.domain} not found in Resend account`
          });
          continue;
        }

        // Add another delay before the second API call
        console.log('Waiting 600ms before domain details call...');
        await sleep(600);

        // Step 2: Get detailed domain information using domain ID
        const detailResponse = await makeResendRequest(`https://api.resend.com/domains/${domain.id}`, domainConfig.apiKey);

        if (!detailResponse.ok) {
          const errorText = await detailResponse.text();
          console.error(`Resend domain details error for ${domainConfig.domain}:`, detailResponse.status, detailResponse.statusText, errorText);
          throw new Error(`Domain details API error: ${detailResponse.status} ${detailResponse.statusText} - ${errorText}`);
        }

        const detailData = await detailResponse.json();
        console.log(`Resend domain details for ${domainConfig.domain}:`, JSON.stringify(detailData, null, 2));

        // Check domain verification and DKIM status using detailed response
        const verified = domain.status === 'verified';
        const dkimVerified = detailData.records?.some((record: any) => 
          record.type === 'DKIM' && record.status === 'verified'
        ) || false;
        
        // Check for return-path/bounce configuration
        const returnPathConfigured = detailData.records?.some((record: any) => 
          record.type === 'RETURN_PATH' && record.status === 'verified'
        ) || false;

        // Check DMARC using DNS-over-HTTPS
        let dmarcConfigured = false;
        let dmarcPolicy = 'none';
        try {
          const dmarcResponse = await fetch(`https://cloudflare-dns.com/dns-query?name=_dmarc.${domainConfig.domain}&type=TXT`, {
            headers: { 'Accept': 'application/dns-json' }
          });
          
          if (dmarcResponse.ok) {
            const dmarcData = await dmarcResponse.json();
            const dmarcRecord = dmarcData.Answer?.find((record: any) => 
              record.data && record.data.includes('v=DMARC1')
            );
            
            if (dmarcRecord) {
              dmarcConfigured = true;
              const policyMatch = dmarcRecord.data.match(/p=([^;]+)/);
              if (policyMatch) {
                dmarcPolicy = policyMatch[1];
              }
            }
          }
        } catch (dmarcError) {
          console.warn(`DMARC check failed for ${domainConfig.domain}:`, dmarcError);
        }

        console.log(`Domain ${domainConfig.domain} parsed status:`, {
          verified,
          dkim_verified: dkimVerified,
          return_path_configured: returnPathConfigured,
          dmarc_configured: dmarcConfigured,
          dmarc_policy: dmarcPolicy,
          records_count: detailData.records?.length || 0
        });

        statuses.push({
          domain: domainConfig.name,
          verified,
          dkim_verified: dkimVerified,
          return_path_configured: returnPathConfigured,
          dmarc_configured: dmarcConfigured,
          dmarc_policy: dmarcPolicy,
          api_key: domainConfig.apiKey.substring(0, 8) + '...',
          debug_records: detailData.records
        });

      } catch (error) {
        console.error(`Error checking domain ${domainConfig.domain}:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Add specific handling for rate limit errors
        const isRateLimit = errorMessage.includes('429') || errorMessage.includes('Too Many Requests');
        
        statuses.push({
          domain: domainConfig.name,
          verified: false,
          dkim_verified: false,
          return_path_configured: false,
          dmarc_configured: false,
          dmarc_policy: 'none',
          api_key: domainConfig.apiKey?.substring(0, 8) + '...' || 'N/A',
          error: isRateLimit ? 'Rate limit exceeded - please wait before refreshing' : errorMessage
        });
      }
    }

    // Cache the results
    cache.set(cacheKey, { data: statuses, timestamp: Date.now() });
    console.log('Cached domain status results for 5 minutes');

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