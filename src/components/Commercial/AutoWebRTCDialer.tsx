import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Mic, MicOff, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AutoWebRTCDialerProps {
  phoneNumber?: string;
  commercial?: any;
  onCallStateChange?: (state: 'idle' | 'connecting' | 'ringing' | 'connected' | 'ended') => void;
}

class AutoWebRTCClient {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteAudio: HTMLAudioElement | null = null;
  private ws: WebSocket | null = null;
  private onStateChange?: (state: string) => void;
  private callId: string | null = null;
  private userId: string;

  constructor(userId: string, onStateChange?: (state: string) => void) {
    this.userId = userId;
    this.onStateChange = onStateChange;
    this.initializeAudio();
  }

  private initializeAudio() {
    this.remoteAudio = new Audio();
    this.remoteAudio.autoplay = true;
    this.remoteAudio.controls = false;
  }

  async initialize() {
    try {
      this.onStateChange?.('connecting');
      
      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }, 
        video: false 
      });

      // Create peer connection with STUN servers
      this.pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10
      });

      // Add local stream
      this.localStream.getTracks().forEach(track => {
        this.pc?.addTrack(track, this.localStream!);
      });

      // Handle remote stream
      this.pc.ontrack = (event) => {
        console.log('Received remote track:', event);
        if (this.remoteAudio && event.streams[0]) {
          this.remoteAudio.srcObject = event.streams[0];
          this.remoteAudio.play().catch(e => console.log('Audio play error:', e));
        }
      };

      // Handle ICE candidates
      this.pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('ICE candidate:', event.candidate);
          // Send ICE candidate to edge function
          this.sendIceCandidate(event.candidate);
        }
      };

      // Connection state monitoring
      this.pc.onconnectionstatechange = () => {
        console.log('Connection state:', this.pc?.connectionState);
        if (this.pc?.connectionState === 'connected') {
          this.onStateChange?.('connected');
        } else if (this.pc?.connectionState === 'failed' || this.pc?.connectionState === 'disconnected') {
          this.onStateChange?.('ended');
        }
      };

      this.onStateChange?.('idle');
      return true;
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
      this.onStateChange?.('ended');
      throw error;
    }
  }

  private async sendIceCandidate(candidate: RTCIceCandidate) {
    try {
      await supabase.functions.invoke('webrtc-calling', {
        body: {
          type: 'ice-candidate',
          candidate: candidate,
          callId: this.callId,
          userId: this.userId
        }
      });
    } catch (error) {
      console.error('Failed to send ICE candidate:', error);
    }
  }


  private formatPhoneNumber(phoneNumber: string): string {
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
  }

  async call(phoneNumber: string) {
    try {
      if (!this.pc) {
        throw new Error('WebRTC not initialized');
      }

      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      console.log(`Formatted phone number: ${phoneNumber} -> ${formattedNumber}`);

      this.onStateChange?.('ringing');
      this.callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create WebRTC offer
      const offer = await this.pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      
      await this.pc.setLocalDescription(offer);

      console.log('Making call with your SIP credentials...');
      
      const sipCredentials = {
        username: '6001',
        password: 'NUrkdRpMubIe7Xrr',
        server: '13.38.136.149',
        port: 5060
      };

      console.log('📞 Calling WebRTC function with:', {
        phoneNumber: formattedNumber,
        userId: this.userId,
        callId: this.callId,
        sipCredentials: { 
          username: sipCredentials.username, 
          server: sipCredentials.server,
          port: sipCredentials.port 
        }
      });

      // Call the edge function with your SIP credentials
      const response = await supabase.functions.invoke('webrtc-calling', {
        body: {
          type: 'call',
          phoneNumber: formattedNumber,
          offer: offer,
          userId: this.userId,
          callId: this.callId,
          sipCredentials: sipCredentials
        }
      });

      console.log('📡 WebRTC calling response:', response);

      if (response.error) {
        console.error('❌ WebRTC call error:', response.error);
        throw new Error(`Call failed: ${response.error.message}`);
      }

      // Handle the response
      const data = response.data;
      if (data && data.answer) {
        await this.pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        this.onStateChange?.('connected');
      } else if (data && data.error) {
        throw new Error(data.error);
      }

    } catch (error) {
      console.error('Failed to make call:', error);
      this.onStateChange?.('ended');
      throw error;
    }
  }

  hangup() {
    if (this.callId) {
      // Send hangup request to edge function
      supabase.functions.invoke('webrtc-calling', {
        body: {
          type: 'hangup',
          callId: this.callId,
          userId: this.userId
        }
      }).catch(error => console.error('Hangup error:', error));
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

  mute(muted: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  }
}

const AutoWebRTCDialer: React.FC<AutoWebRTCDialerProps> = ({ phoneNumber, commercial, onCallStateChange }) => {
  const { toast } = useToast();
  const [callState, setCallState] = useState<'idle' | 'connecting' | 'ringing' | 'connected' | 'ended'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const clientRef = useRef<AutoWebRTCClient | null>(null);

  useEffect(() => {
    onCallStateChange?.(callState);
  }, [callState, onCallStateChange]);

  const handleStateChange = (state: string) => {
    setCallState(state as any);
  };

  const initializeWebRTC = async () => {
    try {
      const userId = commercial?.id || 'anonymous';
      clientRef.current = new AutoWebRTCClient(userId, handleStateChange);
      
      await clientRef.current.initialize();
      setIsInitialized(true);
      
      toast({
        title: "WebRTC Initialisé",
        description: "Prêt pour les appels WebRTC"
      });
    } catch (error: any) {
      console.error('WebRTC initialization failed:', error);
      toast({
        title: "Erreur WebRTC",
        description: error.message || "Initialisation impossible",
        variant: "destructive"
      });
      setCallState('ended');
    }
  };

  const startCall = async () => {
    try {
      if (!clientRef.current) {
        await initializeWebRTC();
      }
      
      if (clientRef.current && phoneNumber) {
        await clientRef.current.call(phoneNumber);
        
        toast({
          title: "Appel WebRTC",
          description: `Appel vers ${phoneNumber}`
        });
      }
    } catch (error: any) {
      console.error('Call failed:', error);
      toast({
        title: "Erreur d'appel",
        description: error.message || "Appel impossible",
        variant: "destructive"
      });
      setCallState('ended');
    }
  };

  const hangup = () => {
    if (clientRef.current) {
      clientRef.current.hangup();
    }
    setCallState('idle');
    setIsInitialized(false);
    clientRef.current = null;
  };

  const toggleMute = () => {
    if (clientRef.current) {
      clientRef.current.mute(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  const getStateIcon = () => {
    switch (callState) {
      case 'connecting': return <Loader2 className="h-3 w-3 text-yellow-400 animate-spin" />;
      case 'ringing': return <Phone className="h-3 w-3 text-blue-400 animate-pulse" />;
      case 'connected': return <Wifi className="h-3 w-3 text-green-400" />;
      case 'ended': return <WifiOff className="h-3 w-3 text-red-400" />;
      default: return <Phone className="h-3 w-3 text-gray-400" />;
    }
  };

  const getStateText = () => {
    switch (callState) {
      case 'connecting': return 'Connexion...';
      case 'ringing': return 'Sonnerie...';
      case 'connected': return 'En ligne';
      case 'ended': return 'Terminé';
      default: return 'WebRTC Auto';
    }
  };

  const getStateColor = () => {
    switch (callState) {
      case 'connecting': return 'text-yellow-400';
      case 'ringing': return 'text-blue-400';
      case 'connected': return 'text-green-400';
      case 'ended': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="relative flex flex-col items-center">
      {/* Blue Call Icon - Enhanced Responsive */}
      {callState === 'idle' ? (
        <Button
          onClick={startCall}
          disabled={!phoneNumber}
          size="lg"
          className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-blue-600 hover:bg-blue-700 text-white p-0 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 active:scale-95"
          title="WebRTC Auto"
        >
          <Phone className="h-7 w-7 sm:h-8 sm:w-8" />
        </Button>
      ) : (
        <Button
          onClick={hangup}
          size="lg"
          className={`h-14 w-14 sm:h-16 sm:w-16 rounded-full text-white p-0 flex items-center justify-center shadow-lg transition-all duration-300 ${
            callState === 'connected' ? 'bg-green-600 hover:bg-green-700 animate-pulse' :
            callState === 'ringing' ? 'bg-yellow-600 hover:bg-yellow-700 animate-pulse' :
            callState === 'connecting' ? 'bg-blue-600 hover:bg-blue-700' :
            'bg-red-600 hover:bg-red-700'
          }`}
          title={callState === 'connected' ? 'Raccrocher' : getStateText()}
        >
          {callState === 'connected' || callState === 'ringing' ? (
            <PhoneOff className="h-7 w-7 sm:h-8 sm:w-8" />
          ) : callState === 'connecting' ? (
            <Loader2 className="h-7 w-7 sm:h-8 sm:w-8 animate-spin" />
          ) : (
            <WifiOff className="h-7 w-7 sm:h-8 sm:w-8" />
          )}
        </Button>
      )}
      
      {/* Status indicator */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs sm:text-sm text-gray-400 whitespace-nowrap">
        WebRTC
      </div>

      {/* Connection status indicator - Enhanced responsive */}
      {callState !== 'idle' && (
        <div className="absolute -bottom-12 sm:-bottom-16 left-1/2 transform -translate-x-1/2 text-center">
          <span className={`${getStateColor()} font-medium text-xs sm:text-sm`}>
            {getStateText()}
          </span>
          {phoneNumber && (
            <div className="text-gray-500 text-xs mt-1 max-w-24 sm:max-w-none truncate">
              {phoneNumber}
            </div>
          )}
        </div>
      )}

      {/* Mute button when connected - Enhanced positioning */}
      {callState === 'connected' && (
        <Button
          onClick={toggleMute}
          size="sm"
          className={`absolute -top-1 -right-1 sm:-top-2 sm:-right-2 h-6 w-6 sm:h-8 sm:w-8 rounded-full p-0 transition-all duration-200 hover:scale-110 ${
            isMuted ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-gray-600 hover:bg-gray-700'
          }`}
          title={isMuted ? 'Réactiver le micro' : 'Couper le micro'}
        >
          {isMuted ? <MicOff className="h-3 w-3 sm:h-4 sm:w-4" /> : <Mic className="h-3 w-3 sm:h-4 sm:w-4" />}
        </Button>
      )}
    </div>
  );
};

export default AutoWebRTCDialer;