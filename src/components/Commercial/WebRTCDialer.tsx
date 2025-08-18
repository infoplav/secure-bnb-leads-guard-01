import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Mic, MicOff, Settings, Wifi, WifiOff } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';

interface WebRTCDialerProps {
  sipConfig?: {
    server: string;
    username: string;
    password: string;
    domain?: string;
  };
  phoneNumber?: string;
  onCallStateChange?: (state: 'idle' | 'connecting' | 'registered' | 'ringing' | 'connected' | 'ended' | 'failed') => void;
}

class RealSIPClient {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteAudio: HTMLAudioElement | null = null;
  private sipConfig: any;
  private onStateChange?: (state: string) => void;
  private callId: string | null = null;

  constructor(config: any, onStateChange?: (state: string) => void) {
    this.sipConfig = config;
    this.onStateChange = onStateChange;
    this.initializeAudio();
  }

  private initializeAudio() {
    this.remoteAudio = new Audio();
    this.remoteAudio.autoplay = true;
    this.remoteAudio.controls = false;
  }

  async connect() {
    try {
      console.log('🔌 Connecting to SIP server:', {
        server: this.sipConfig.server,
        username: this.sipConfig.username,
        domain: this.sipConfig.domain,
        password: this.sipConfig.password ? '***' : 'not provided'
      });

      this.onStateChange?.('connecting');
      
      // Get user media first
      this.localStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }, 
        video: false 
      });

      console.log('🎤 Microphone access granted');

      // Initialize WebRTC peer connection
      this.pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Add local stream to peer connection
      this.localStream.getTracks().forEach(track => {
        this.pc!.addTrack(track, this.localStream!);
      });

      // Handle remote stream
      this.pc.ontrack = (event) => {
        console.log('🔊 Remote track received');
        if (this.remoteAudio && event.streams[0]) {
          this.remoteAudio.srcObject = event.streams[0];
        }
      };

      // For now, simulate successful registration
      console.log('✅ SIP simulation - registered successfully');
      this.onStateChange?.('registered');
      
      return true;

    } catch (error) {
      console.error('❌ Failed to connect:', error);
      this.onStateChange?.('failed');
      throw error;
    }
  }

  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // If it already starts with +, return digits only
    if (phoneNumber.startsWith('+')) {
      return phoneNumber.replace(/[^0-9]/g, '');
    }
    
    // If it starts with 0, assume French number and replace with 33
    if (cleaned.startsWith('0')) {
      return '33' + cleaned.substring(1);
    }
    
    // If it doesn't start with country code, assume French
    if (cleaned.length === 9 || cleaned.length === 10) {
      return '33' + cleaned;
    }
    
    // Otherwise return as is
    return cleaned;
  }

  async call(phoneNumber: string) {
    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      console.log(`📞 Initiating SIP call: ${phoneNumber} -> ${formattedNumber}`);
      console.log('📋 Using SIP credentials:', {
        server: this.sipConfig.server,
        username: this.sipConfig.username,
        domain: this.sipConfig.domain
      });
      
      this.onStateChange?.('ringing');
      this.callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create SDP offer
      const offer = await this.pc!.createOffer();
      await this.pc!.setLocalDescription(offer);

      console.log('📤 Sending call request to edge function');

      // Call the edge function for real SIP calling
      const { data, error } = await supabase.functions.invoke('webrtc-calling', {
        body: {
          type: 'call',
          phoneNumber: formattedNumber,
          offer: offer,
          userId: 'current-user-id',
          callId: this.callId,
          sipCredentials: {
            username: this.sipConfig.username,
            password: this.sipConfig.password,
            server: this.sipConfig.server,
            domain: this.sipConfig.domain,
            port: 5060
          }
        }
      });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw new Error(`Call failed: ${error.message}`);
      }

      console.log('📥 Edge function response:', data);

      if (data?.success && data?.answer) {
        // Set remote description from SIP server response
        await this.pc!.setRemoteDescription(new RTCSessionDescription(data.answer));
        console.log('✅ Call connected via edge function');
        this.onStateChange?.('connected');
      } else {
        throw new Error(data?.error || 'Call failed');
      }

    } catch (error: any) {
      console.error('❌ Failed to make call:', error);
      this.onStateChange?.('failed');
      throw error;
    }
  }

  hangup() {
    console.log('📴 Hanging up call');
    
    if (this.callId) {
      // Notify edge function of hangup
      supabase.functions.invoke('webrtc-calling', {
        body: {
          type: 'hangup',
          callId: this.callId,
          userId: 'current-user-id'
        }
      }).catch(error => {
        console.error('Error notifying hangup:', error);
      });
    }
    
    this.cleanup();
    this.onStateChange?.('idle');
  }

  private cleanup() {
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    if (this.remoteAudio) {
      this.remoteAudio.srcObject = null;
    }

    this.callId = null;
  }

  disconnect() {
    console.log('🔌 Disconnecting SIP client');
    this.hangup();
  }

  mute(muted: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
      console.log(`🔇 Microphone ${muted ? 'muted' : 'unmuted'}`);
    }
  }
}

const WebRTCDialer: React.FC<WebRTCDialerProps> = ({ sipConfig, phoneNumber, onCallStateChange }) => {
  const { toast } = useToast();
  const [callState, setCallState] = useState<'idle' | 'connecting' | 'registered' | 'ringing' | 'connected' | 'ended' | 'failed'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    server: sipConfig?.server || '13.38.136.149',
    username: sipConfig?.username || '6001',
    password: sipConfig?.password || 'NUrkdRpMubIe7Xrr',
    domain: sipConfig?.domain || '13.38.136.149'
  });
  
  const sipClientRef = useRef<RealSIPClient | null>(null);

  useEffect(() => {
    onCallStateChange?.(callState);
  }, [callState, onCallStateChange]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (sipClientRef.current) {
        sipClientRef.current.disconnect();
        sipClientRef.current = null;
      }
    };
  }, []);

  const handleStateChange = (state: string) => {
    console.log('📊 Call state changed:', state);
    setCallState(state as any);
  };

  const initializeCall = async () => {
    try {
      console.log('🚀 Initializing real SIP call with settings:', {
        server: settings.server,
        username: settings.username,
        domain: settings.domain,
        phoneNumber: phoneNumber
      });

      sipClientRef.current = new RealSIPClient(settings, handleStateChange);
      await sipClientRef.current.connect();
      
      if (phoneNumber) {
        await sipClientRef.current.call(phoneNumber);
      }
      
      toast({
        title: "Real SIP WebRTC",
        description: `Calling ${phoneNumber} via ${settings.server}`
      });
    } catch (error: any) {
      console.error('❌ Call failed:', error);
      toast({
        title: "SIP Call Error",
        description: error.message || "Connection failed",
        variant: "destructive"
      });
      setCallState('failed');
    }
  };

  const hangup = () => {
    if (sipClientRef.current) {
      sipClientRef.current.hangup();
    }
    setCallState('idle');
  };

  const toggleMute = () => {
    if (sipClientRef.current) {
      sipClientRef.current.mute(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  const getStateIcon = () => {
    switch (callState) {
      case 'connecting': return <Wifi className="h-3 w-3 text-yellow-400 animate-pulse" />;
      case 'registered': return <Wifi className="h-3 w-3 text-green-400" />;
      case 'ringing': return <Phone className="h-3 w-3 text-blue-400 animate-pulse" />;
      case 'connected': return <Phone className="h-3 w-3 text-green-400" />;
      case 'ended': return <PhoneOff className="h-3 w-3 text-gray-400" />;
      case 'failed': return <WifiOff className="h-3 w-3 text-red-400" />;
      default: return <Phone className="h-3 w-3 text-gray-400" />;
    }
  };

  const getStateText = () => {
    switch (callState) {
      case 'connecting': return 'Connecting...';
      case 'registered': return 'Registered';
      case 'ringing': return 'Ringing...';
      case 'connected': return 'Connected';
      case 'ended': return 'Ended';
      case 'failed': return 'Failed';
      default: return 'SIP Ready';
    }
  };

  return (
    <>
      {/* Compact SIP WebRTC Controls */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {getStateIcon()}
              <span className="text-sm text-gray-300">{getStateText()}</span>
            </div>
            
            {callState === 'connected' && (
              <Button
                onClick={toggleMute}
                size="sm"
                variant="outline"
                className={`h-7 px-2 border-gray-600 ${
                  isMuted ? 'bg-red-600 text-white' : 'text-gray-300'
                }`}
              >
                {isMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowSettings(true)}
              size="sm"
              variant="outline"
              className="h-7 px-2 border-gray-600 text-gray-300"
            >
              <Settings className="h-3 w-3" />
            </Button>
            
            {(callState === 'idle' || callState === 'registered' || callState === 'failed') ? (
              <Button
                onClick={initializeCall}
                disabled={!phoneNumber}
                size="sm"
                className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs"
              >
                <Phone className="h-3 w-3 mr-1" />
                Real SIP
              </Button>
            ) : (
              <Button
                onClick={hangup}
                size="sm"
                className="h-7 px-3 bg-red-600 hover:bg-red-700 text-white text-xs"
              >
                <PhoneOff className="h-3 w-3 mr-1" />
                Hang Up
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-yellow-400">Real SIP Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="server" className="text-gray-300">SIP Server</Label>
              <Input
                id="server"
                value={settings.server}
                onChange={(e) => setSettings({...settings, server: e.target.value})}
                placeholder="13.38.136.149"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="username" className="text-gray-300">Username</Label>
              <Input
                id="username"
                value={settings.username}
                onChange={(e) => setSettings({...settings, username: e.target.value})}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="password" className="text-gray-300">Password</Label>
              <Input
                id="password"
                type="password"
                value={settings.password}
                onChange={(e) => setSettings({...settings, password: e.target.value})}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div>
              <Label htmlFor="domain" className="text-gray-300">Domain</Label>
              <Input
                id="domain"
                value={settings.domain}
                onChange={(e) => setSettings({...settings, domain: e.target.value})}
                placeholder="13.38.136.149"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => setShowSettings(false)}
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={() => setShowSettings(false)}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-black"
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WebRTCDialer;
