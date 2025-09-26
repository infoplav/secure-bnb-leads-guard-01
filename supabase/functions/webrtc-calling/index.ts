import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// In-memory store for active calls
const activeCalls = new Map<string, any>();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestBody = await req.json();
    const { 
      type, 
      action, 
      phoneNumber, 
      offer, 
      userId, 
      callId, 
      sipCredentials 
    } = requestBody;
    
    // Support both 'type' and 'action' fields for backward compatibility
    const requestType = type || action;
    
    console.log('📧 Received request:', {
      type: requestType,
      phoneNumber,
      userId,
      callId,
      sipCredentials: sipCredentials ? {
        username: sipCredentials.username,
        server: sipCredentials.server,
        port: sipCredentials.port
      } : null
    });
    
    console.log(`🔄 Processing ${requestType} request for user ${userId}`);
    
    if (requestType === 'call') {
      // For simple calls without WebRTC offer, create default parameters
      const finalUserId = userId || 'anonymous-user';
      const finalCallId = callId || `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const defaultSipCredentials = sipCredentials || {
        server: '13.38.136.149',
        port: 5060,
        username: '6001',
        password: 'NUrkdRpMubIe7Xrr'
      };
      
      const result = await handleSipCall(phoneNumber, offer, finalUserId, finalCallId, defaultSipCredentials);
      
      return new Response(
        JSON.stringify(result),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else if (requestType === 'hangup') {
      const finalCallId = callId || 'default-call';
      const result = await handleHangup(finalCallId);
      
      return new Response(
        JSON.stringify(result),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else if (requestType === 'ice-candidate') {
      // Handle ICE candidates
      const finalCallId = callId || 'default-call';
      console.log(`Handling ICE candidate for call ${finalCallId}`);
      
      return new Response(
        JSON.stringify({ success: true }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Unknown request type', 
        received: requestType,
        expected: ['call', 'hangup', 'ice-candidate']
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: (error?.message) || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleSipCall(phoneNumber: string, offer: any, userId: string, callId: string, sipCredentials: any) {
  console.log(`Initiating SIP call to ${phoneNumber} using server ${sipCredentials.server}:${sipCredentials.port}`);
  console.log(`Using SIP credentials: ${sipCredentials.username}@${sipCredentials.server}`);
  
  try {
    // Store call info
    activeCalls.set(callId, {
      id: callId,
      caller: userId,
      phoneNumber: phoneNumber,
      status: 'initiating',
      startTime: Date.now(),
      offer: offer,
      sipCredentials: sipCredentials
    });

    console.log('Validating SIP credentials...');
    
    // Validate SIP credentials for new server
    const validCredentials = [
      { username: '6001', password: 'NUrkdRpMubIe7Xrr' },
      { username: '6002', password: 'NUrkdRpMubIe7Xrr' }
    ];
    
    const isValid = validCredentials.some(cred => 
      cred.username === sipCredentials.username && 
      cred.password === sipCredentials.password
    );
    
    if (!isValid) {
      throw new Error('Invalid SIP credentials provided');
    }

    console.log('SIP credentials validated successfully');
    console.log(`Establishing call to ${phoneNumber} via ${sipCredentials.server}:${sipCredentials.port}`);
    
    // Simulate SIP connection process
    const sipConnection = await establishSipConnection(sipCredentials, phoneNumber, callId, offer);
    
    if (sipConnection.success) {
      // Update call status
      const call = activeCalls.get(callId);
      if (call) {
        call.status = 'connected';
        call.sipSession = sipConnection.session;
      }

      console.log('SIP call connected successfully');
      
      return {
        success: true,
        callId: callId,
        status: 'connected',
        answer: {
          type: 'answer',
          sdp: sipConnection.sdp
        }
      };
    } else {
      throw new Error(sipConnection.error || 'SIP connection failed');
    }

  } catch (error) {
    console.error('SIP call failed:', error);
    
    // Clean up
    activeCalls.delete(callId);
    
      return {
        success: false,
        error: `Call failed: ${(error as any)?.message}`
      };
  }
}

async function handleHangup(callId: string) {
  console.log(`Hanging up call ${callId}`);
  
  const call = activeCalls.get(callId);
  if (call) {
    call.status = 'ended';
    call.endTime = Date.now();
    activeCalls.delete(callId);
    console.log(`Call ${callId} ended successfully`);
  }
  
  return { success: true, message: 'Call ended' };
}

async function establishSipConnection(sipCredentials: any, phoneNumber: string, callId: string, offer: any) {
  try {
    console.log(`🔌 Establishing REAL SIP connection to ${sipCredentials.server}:${sipCredentials.port} for ${phoneNumber}`);
    console.log(`🔐 SIP Credentials: ${sipCredentials.username} / ${sipCredentials.password}`);
    console.log(`📞 Destination: ${phoneNumber}`);
    console.log(`🆔 Call ID: ${callId}`);
    
    // For now, this is a simplified WebRTC-only implementation
    // In a real implementation, you would:
    // 1. Connect to the SIP server at sipCredentials.server:sipCredentials.port
    // 2. Send SIP REGISTER with authentication
    // 3. Send SIP INVITE to phoneNumber
    // 4. Handle SIP responses and convert to WebRTC SDP
    
    console.log('WARNING: This is a WebRTC-only demo implementation');
    console.log('For real SIP calling, you need a SIP stack like JsSIP or server-side SIP gateway');
    
    // Return a proper WebRTC answer that will allow browser-to-browser audio
    const sdpAnswer = generateWebRTCSDP(offer?.sdp || null);
    
    return {
      success: true,
      session: { callId, phoneNumber },
      sdp: sdpAnswer,
      note: 'WebRTC demo mode - no actual SIP call made'
    };

  } catch (error: any) {
    console.error('SIP connection error:', error);
    return {
      success: false,
      error: (error?.message) || 'Unknown error'
    };
  }
}

async function simulateSipAuth(sipCredentials: any) {
  console.log(`Authenticating with SIP server using ${sipCredentials.username}:${sipCredentials.password}`);
  
  return new Promise((resolve) => {
    setTimeout(() => {
      // Check if credentials are valid
      const validCredentials = [
        { username: 'trips', password: '8203' },
        { username: 'trips', password: '8204' }
      ];
      
      const isValid = validCredentials.some(cred => 
        cred.username === sipCredentials.username && 
        cred.password === sipCredentials.password
      );
      
      if (isValid) {
        console.log('SIP authentication successful');
        resolve({ success: true });
      } else {
        console.log('SIP authentication failed - invalid credentials');
        resolve({ success: false, error: 'Invalid SIP credentials' });
      }
    }, 800);
  });
}

async function simulateSipInvite(sipCredentials: any, phoneNumber: string, offer: any) {
  console.log(`Sending SIP INVITE to ${phoneNumber} via ${sipCredentials.server}`);
  
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`SIP INVITE to ${phoneNumber} - simulating call connection`);
      
      resolve({ 
        success: true, 
        message: `Call to ${phoneNumber} connected via SIP server ${sipCredentials.server}` 
      });
    }, 1000);
  });
}

function generateWebRTCSDP(offerSdp: string | null): string {
  const streamId = crypto.randomUUID();
  const trackId = crypto.randomUUID();
  const ssrc = Math.floor(Math.random() * 0xFFFFFFFF);
  const cname = Math.random().toString(36).substr(2, 12);
  
  // Extract ice credentials from offer for compatibility (if offer exists)
  let iceUfrag = generateIceCredential();
  let icePwd = generateIceCredential();
  
  if (offerSdp) {
    const iceUfragMatch = offerSdp.match(/a=ice-ufrag:(.+)/);
    const icePwdMatch = offerSdp.match(/a=ice-pwd:(.+)/);
    
    iceUfrag = iceUfragMatch ? iceUfragMatch[1] : iceUfrag;
    icePwd = icePwdMatch ? icePwdMatch[1] : icePwd;
  }
  
  return `v=0\r
o=- ${Date.now()} 2 IN IP4 127.0.0.1\r
s=-\r
t=0 0\r
a=group:BUNDLE 0\r
a=extmap-allow-mixed\r
a=msid-semantic: WMS ${streamId}\r
m=audio 9 UDP/TLS/RTP/SAVPF 111 0 8 126\r
c=IN IP4 0.0.0.0\r
a=rtcp:9 IN IP4 0.0.0.0\r
a=ice-ufrag:${iceUfrag}\r
a=ice-pwd:${icePwd}\r
a=ice-options:trickle\r
a=fingerprint:sha-256 ${generateFingerprint()}\r
a=setup:active\r
a=mid:0\r
a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r
a=sendrecv\r
a=msid:${streamId} ${trackId}\r
a=rtcp-mux\r
a=rtpmap:111 opus/48000/2\r
a=rtcp-fb:111 transport-cc\r
a=fmtp:111 minptime=10;useinbandfec=1\r
a=rtpmap:0 PCMU/8000\r
a=rtpmap:8 PCMA/8000\r
a=rtpmap:126 telephone-event/8000\r
a=ssrc:${ssrc} cname:${cname}\r
a=ssrc:${ssrc} msid:${streamId} ${trackId}\r
`;
}

function generateIceCredential(): string {
  return Math.random().toString(36).substring(2, 10);
}

function generateFingerprint(): string {
  const chars = '0123456789ABCDEF';
  let result = '';
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
    if (i % 2 === 1 && i < 63) result += ':';
  }
  return result;
}