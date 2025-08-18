import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface SipDialerV2Props {
  commercial?: any;
  onBack: () => void;
  onLogout: () => void;
}

type CallState = 'idle' | 'registering' | 'registered' | 'calling' | 'ringing' | 'connected' | 'ended' | 'failed';

const SipDialerV2: React.FC<SipDialerV2Props> = ({ commercial, onBack, onLogout }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedExtension, setSelectedExtension] = useState('8203');
  const [callState, setCallState] = useState<CallState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [sipCredentials, setSipCredentials] = useState<any[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const callIdRef = useRef<string>('');
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // Load SIP credentials on mount
  useEffect(() => {
    loadSipCredentials();
  }, []);

  // Call duration timer
  useEffect(() => {
    if (callState === 'connected') {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
      if (callState === 'idle') {
        setCallDuration(0);
      }
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [callState]);

  const loadSipCredentials = async () => {
    try {
      const { data, error } = await supabase
        .from('sip_credentials')
        .select('*')
        .order('extension');

      if (error) throw error;
      setSipCredentials(data || []);
    } catch (error) {
      console.error('Error loading SIP credentials:', error);
      toast.error('Failed to load SIP credentials');
    }
  };

  const connectWebSocket = () => {
    const wsUrl = `wss://lnokphjzmvdegutjpxhw.supabase.co/functions/v1/webrtc-sip-gateway`;
    
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log('WebSocket connected to SIP gateway');
      registerSipExtension();
    };

    wsRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleGatewayMessage(message);
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket connection closed');
      setCallState('idle');
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast.error('Connection to SIP gateway failed');
      setCallState('failed');
    };
  };

  const registerSipExtension = () => {
    if (!wsRef.current) return;

    console.log('🔐 Registering SIP extension:', selectedExtension);
    console.log('📡 WebSocket state:', wsRef.current.readyState);
    
    setCallState('registering');
    const registerMessage = {
      type: 'register',
      extension: selectedExtension
    };
    
    console.log('📤 Sending registration message:', registerMessage);
    wsRef.current.send(JSON.stringify(registerMessage));
  };

  const handleGatewayMessage = (message: any) => {
    console.log('📥 Received gateway message:', message);
    const { type, callId, state, duration } = message;

    switch (type) {
      case 'registered':
        console.log('✅ SIP registration successful for extension:', selectedExtension);
        setCallState('registered');
        toast.success(`Extension ${selectedExtension} registered successfully`);
        break;

      case 'registration_failed':
        console.error('❌ SIP registration failed:', message);
        setCallState('failed');
        toast.error(`Registration failed: ${message.message}`);
        break;

      case 'call_progress':
        console.log('📞 Call progress update:', { state, callId, message });
        setCallState(state);
        if (state === 'ringing') {
          toast.info('Call is ringing...');
        } else if (state === 'connected') {
          toast.success('Call connected!');
        }
        break;

      case 'call_failed':
        console.error('❌ Call failed:', message);
        setCallState('failed');
        toast.error(`Call failed: ${message.message}`);
        break;

      case 'call_ended':
        console.log('📞 Call ended:', { duration, callId });
        setCallState('ended');
        setTimeout(() => setCallState('registered'), 2000);
        toast.info(`Call ended. Duration: ${formatTime(duration)}`);
        break;

      default:
        console.log('❓ Unknown gateway message:', message);
    }
  };

  const formatPhoneNumber = (phoneNumber: string): string => {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // If it already starts with +, return as is
    if (phoneNumber.startsWith('+')) {
      return phoneNumber.replace(/\s/g, '');
    }
    
    // If it starts with 0, assume French number and replace with +33
    if (cleaned.startsWith('0')) {
      return '+33' + cleaned.substring(1);
    }
    
    // If it doesn't start with country code, assume French
    if (cleaned.length === 9 || cleaned.length === 10) {
      return '+33' + cleaned;
    }
    
    // Otherwise add + if missing
    return '+' + cleaned;
  };

  const startCall = async () => {
    if (!phoneNumber.trim() || callState !== 'registered') {
      toast.error('Please enter a phone number and ensure extension is registered');
      return;
    }

    const formattedNumber = formatPhoneNumber(phoneNumber);
    console.log(`Formatted phone number: ${phoneNumber} -> ${formattedNumber}`);

    try {
      // Get user media for the call
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: false 
      });

      // Create simple SDP offer (simplified for demo)
      const sdpOffer = `v=0
o=- ${Date.now()} 1 IN IP4 127.0.0.1
s=SIP Call
c=IN IP4 127.0.0.1
t=0 0
m=audio 5004 RTP/AVP 0 8
a=rtpmap:0 PCMU/8000
a=rtpmap:8 PCMA/8000`;

      callIdRef.current = `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const callMessage = {
        type: 'call',
        extension: selectedExtension,
        targetNumber: formattedNumber,
        sdp: sdpOffer,
        callId: callIdRef.current
      };
      
      console.log('📞 Initiating call with details:', {
        extension: selectedExtension,
        targetNumber: formattedNumber,
        callId: callIdRef.current,
        sdpOfferLength: sdpOffer.length
      });
      
      wsRef.current?.send(JSON.stringify(callMessage));

      setCallState('calling');
      toast.info(`Calling ${formattedNumber}...`);

    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('Failed to access microphone');
    }
  };

  const endCall = () => {
    if (wsRef.current && callIdRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'hangup',
        callId: callIdRef.current
      }));
    }

    // Clean up media
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    setCallState('ended');
    setTimeout(() => setCallState('registered'), 1000);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
      toast.info(isMuted ? 'Microphone unmuted' : 'Microphone muted');
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const dialpadNumbers = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#']
  ];

  const handleNumberClick = (digit: string) => {
    setPhoneNumber(prev => prev + digit);
  };

  const handleBackspace = () => {
    setPhoneNumber(prev => prev.slice(0, -1));
  };

  const getCallStateColor = (state: CallState) => {
    switch (state) {
      case 'registered': return 'bg-green-500';
      case 'calling':
      case 'ringing': return 'bg-yellow-500';
      case 'connected': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={onBack}>
            ← Back
          </Button>
          <Badge variant="outline">{commercial?.name || 'Commercial'}</Badge>
          <Button variant="ghost" onClick={onLogout}>
            Logout
          </Button>
        </div>

        {/* SIP Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              SIP Dialer
              <Badge className={getCallStateColor(callState)}>
                {callState.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Extension Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Extension</label>
              <select 
                value={selectedExtension}
                onChange={(e) => setSelectedExtension(e.target.value)}
                className="w-full p-2 border rounded-md"
                disabled={callState !== 'idle'}
              >
                {sipCredentials.map((cred) => (
                  <option key={cred.extension} value={cred.extension}>
                    {cred.extension} - {cred.display_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Connect Button */}
            {callState === 'idle' && (
              <Button onClick={connectWebSocket} className="w-full">
                Connect & Register
              </Button>
            )}

            {/* Phone Number Input */}
            <div>
              <label className="block text-sm font-medium mb-2">Phone Number</label>
              <div className="flex space-x-2">
                <Input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter phone number"
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  onClick={handleBackspace}
                  disabled={!phoneNumber}
                >
                  ⌫
                </Button>
              </div>
            </div>

            {/* Call Duration */}
            {callState === 'connected' && (
              <div className="text-center">
                <div className="text-2xl font-mono">{formatTime(callDuration)}</div>
                <div className="text-sm text-muted-foreground">Call Duration</div>
              </div>
            )}

            {/* Dialpad */}
            <div className="grid grid-cols-3 gap-2">
              {dialpadNumbers.flat().map((digit) => (
                <Button
                  key={digit}
                  variant="outline"
                  className="aspect-square text-lg"
                  onClick={() => handleNumberClick(digit)}
                  disabled={callState === 'calling' || callState === 'ringing'}
                >
                  {digit}
                </Button>
              ))}
            </div>

            {/* Call Controls */}
            <div className="flex justify-center space-x-4">
              {callState === 'registered' && (
                <Button
                  onClick={startCall}
                  disabled={!phoneNumber.trim()}
                  className="bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Call
                </Button>
              )}

              {(callState === 'calling' || callState === 'ringing' || callState === 'connected') && (
                <>
                  <Button
                    onClick={endCall}
                    variant="destructive"
                    size="lg"
                  >
                    <PhoneOff className="w-5 h-5 mr-2" />
                    Hang Up
                  </Button>

                  {callState === 'connected' && (
                    <Button
                      onClick={toggleMute}
                      variant={isMuted ? "destructive" : "outline"}
                      size="lg"
                    >
                      {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </Button>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Audio element for remote audio */}
        <audio ref={remoteAudioRef} autoPlay hidden />
      </div>
    </div>
  );
};

export default SipDialerV2;