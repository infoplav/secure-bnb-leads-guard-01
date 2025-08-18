import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple SIP message builder
class SipMessageBuilder {
  static buildRegister(extension: string, password: string, callId: string): string {
    const sipServer = '195.154.179.234:5744';
    const contact = `<sip:${extension}@${sipServer}>`;
    const from = `<sip:${extension}@195.154.179.234>`;
    const to = from;
    
    return [
      `REGISTER sip:195.154.179.234 SIP/2.0`,
      `Via: SIP/2.0/UDP gateway:5060;branch=z9hG4bK${Math.random().toString(36).substr(2, 9)}`,
      `Max-Forwards: 70`,
      `From: ${from};tag=${Math.random().toString(36).substr(2, 9)}`,
      `To: ${to}`,
      `Call-ID: ${callId}`,
      `CSeq: 1 REGISTER`,
      `Contact: ${contact}`,
      `Authorization: Digest username="${extension}", realm="asterisk", nonce="${Math.random().toString(36)}", uri="sip:195.154.179.234", response="${password}"`,
      `Content-Length: 0`,
      ``,
      ``
    ].join('\r\n');
  }

  static buildInvite(extension: string, targetNumber: string, callId: string, sdp: string): string {
    const sipServer = '195.154.179.234:5744';
    const from = `<sip:${extension}@195.154.179.234>`;
    const to = `<sip:${targetNumber}@195.154.179.234>`;
    
    return [
      `INVITE sip:${targetNumber}@195.154.179.234 SIP/2.0`,
      `Via: SIP/2.0/UDP gateway:5060;branch=z9hG4bK${Math.random().toString(36).substr(2, 9)}`,
      `Max-Forwards: 70`,
      `From: ${from};tag=${Math.random().toString(36).substr(2, 9)}`,
      `To: ${to}`,
      `Call-ID: ${callId}`,
      `CSeq: 1 INVITE`,
      `Contact: <sip:${extension}@gateway:5060>`,
      `Content-Type: application/sdp`,
      `Content-Length: ${sdp.length}`,
      ``,
      sdp
    ].join('\r\n');
  }

  static buildBye(callId: string): string {
    return [
      `BYE sip:target@195.154.179.234 SIP/2.0`,
      `Via: SIP/2.0/UDP gateway:5060;branch=z9hG4bK${Math.random().toString(36).substr(2, 9)}`,
      `Call-ID: ${callId}`,
      `CSeq: 2 BYE`,
      `Content-Length: 0`,
      ``,
      ``
    ].join('\r\n');
  }
}

// WebRTC-SIP Gateway
class WebRTCSipGateway {
  private supabase: any;
  private activeCalls: Map<string, any> = new Map();
  private sipSocket: Deno.UdpConn | null = null;

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    this.initializeSipSocket();
  }

  private async initializeSipSocket() {
    try {
      // Create UDP socket for SIP communication
      this.sipSocket = Deno.listenDatagram({
        port: 0, // Let system assign port
        transport: "udp",
      });
      console.log('SIP UDP socket initialized');
    } catch (error) {
      console.error('Failed to initialize SIP socket:', error);
    }
  }

  async handleWebSocketConnection(socket: WebSocket) {
    console.log('New WebSocket connection established');

    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        await this.handleWebRTCMessage(socket, message);
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
        socket.send(JSON.stringify({ 
          type: 'error', 
          message: 'Failed to process message' 
        }));
      }
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed');
      // Clean up any active calls
      this.cleanupConnection(socket);
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private async handleWebRTCMessage(socket: WebSocket, message: any) {
    const { type, extension, targetNumber, sdp, callId } = message;

    switch (type) {
      case 'register':
        await this.handleSipRegistration(socket, extension);
        break;
      
      case 'call':
        await this.handleOutboundCall(socket, extension, targetNumber, sdp, callId);
        break;
      
      case 'hangup':
        await this.handleHangup(socket, callId);
        break;
      
      case 'answer':
        await this.handleAnswer(socket, callId, sdp);
        break;
      
      default:
        console.log('Unknown message type:', type);
    }
  }

  private async handleSipRegistration(socket: WebSocket, extension: string) {
    try {
      // Get SIP credentials from database
      const { data: credentials } = await this.supabase
        .from('sip_credentials')
        .select('*')
        .eq('extension', extension)
        .single();

      if (!credentials) {
        socket.send(JSON.stringify({
          type: 'registration_failed',
          message: 'Invalid extension'
        }));
        return;
      }

      const callId = `reg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const registerMessage = SipMessageBuilder.buildRegister(
        extension, 
        credentials.password, 
        callId
      );

      // Send SIP REGISTER to server
      if (this.sipSocket) {
        const encoder = new TextEncoder();
        const data = encoder.encode(registerMessage);
        await this.sipSocket.send(data, { 
          hostname: '195.154.179.234', 
          port: 5744 
        });

        // Simulate successful registration for now
        setTimeout(() => {
          socket.send(JSON.stringify({
            type: 'registered',
            extension: extension
          }));
        }, 1000);
      }

    } catch (error) {
      console.error('Registration error:', error);
      socket.send(JSON.stringify({
        type: 'registration_failed',
        message: error.message
      }));
    }
  }

  private async handleOutboundCall(socket: WebSocket, extension: string, targetNumber: string, sdp: string, callId: string) {
    try {
      // Log call to database
      await this.supabase
        .from('call_history')
        .insert({
          extension,
          target_number: targetNumber,
          call_state: 'initiated'
        });

      // Store call info
      this.activeCalls.set(callId, {
        socket,
        extension,
        targetNumber,
        startTime: Date.now()
      });

      // Build and send SIP INVITE
      const inviteMessage = SipMessageBuilder.buildInvite(extension, targetNumber, callId, sdp);
      
      if (this.sipSocket) {
        const encoder = new TextEncoder();
        const data = encoder.encode(inviteMessage);
        await this.sipSocket.send(data, { 
          hostname: '195.154.179.234', 
          port: 5744 
        });

        // Simulate call progression
        setTimeout(() => {
          socket.send(JSON.stringify({
            type: 'call_progress',
            state: 'ringing',
            callId
          }));
        }, 500);

        setTimeout(() => {
          socket.send(JSON.stringify({
            type: 'call_progress',
            state: 'connected',
            callId
          }));
        }, 3000);
      }

    } catch (error) {
      console.error('Call initiation error:', error);
      socket.send(JSON.stringify({
        type: 'call_failed',
        callId,
        message: error.message
      }));
    }
  }

  private async handleHangup(socket: WebSocket, callId: string) {
    try {
      const callInfo = this.activeCalls.get(callId);
      if (!callInfo) return;

      // Calculate call duration
      const duration = Math.floor((Date.now() - callInfo.startTime) / 1000);

      // Update call history
      await this.supabase
        .from('call_history')
        .update({
          call_state: 'ended',
          call_duration: duration,
          ended_at: new Date().toISOString()
        })
        .eq('extension', callInfo.extension)
        .eq('target_number', callInfo.targetNumber);

      // Send SIP BYE
      const byeMessage = SipMessageBuilder.buildBye(callId);
      if (this.sipSocket) {
        const encoder = new TextEncoder();
        const data = encoder.encode(byeMessage);
        await this.sipSocket.send(data, { 
          hostname: '195.154.179.234', 
          port: 5744 
        });
      }

      // Clean up
      this.activeCalls.delete(callId);

      socket.send(JSON.stringify({
        type: 'call_ended',
        callId,
        duration
      }));

    } catch (error) {
      console.error('Hangup error:', error);
    }
  }

  private async handleAnswer(socket: WebSocket, callId: string, sdp: string) {
    // Handle SIP answer for incoming calls (if needed)
    console.log('Answer received for call:', callId);
  }

  private cleanupConnection(socket: WebSocket) {
    // Clean up any calls associated with this socket
    for (const [callId, callInfo] of this.activeCalls.entries()) {
      if (callInfo.socket === socket) {
        this.activeCalls.delete(callId);
      }
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle HTTP POST requests for call logging
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const { action, extension, target_number, call_id, duration } = body;

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      if (action === 'call_start') {
        await supabase
          .from('call_history')
          .insert({
            extension,
            target_number,
            call_state: 'initiated',
            started_at: new Date().toISOString()
          });
      } else if (action === 'call_end') {
        await supabase
          .from('call_history')
          .update({
            call_state: 'ended',
            call_duration: duration,
            ended_at: new Date().toISOString()
          })
          .eq('extension', extension)
          .eq('target_number', target_number)
          .eq('call_state', 'initiated')
          .order('started_at', { ascending: false })
          .limit(1);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Call logging error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { 
      status: 400,
      headers: corsHeaders 
    });
  }

  try {
    const { socket, response } = Deno.upgradeWebSocket(req);
    const gateway = new WebRTCSipGateway();
    
    await gateway.handleWebSocketConnection(socket);
    
    return response;
  } catch (error) {
    console.error('WebSocket upgrade error:', error);
    return new Response("WebSocket upgrade failed", { 
      status: 500,
      headers: corsHeaders 
    });
  }
});