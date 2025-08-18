import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Mic, MicOff, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
// @ts-ignore - JsSIP types not available
import * as JsSIP from 'jssip';

interface SimpleSipDialerProps {
  phoneNumber?: string;
  commercial?: any;
  onCallStateChange?: (state: 'idle' | 'connecting' | 'ringing' | 'connected' | 'ended') => void;
  autoCall?: boolean; // New prop to automatically initiate call
}

const SimpleSipDialer: React.FC<SimpleSipDialerProps> = ({ 
  phoneNumber, 
  commercial, 
  onCallStateChange,
  autoCall = false
}) => {
  const { toast } = useToast();
  const [callState, setCallState] = useState<'idle' | 'connecting' | 'ringing' | 'connected' | 'ended'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  
  const uaRef = useRef<any>(null);
  const sessionRef = useRef<any>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Check if JsSIP is loaded
    if (typeof JsSIP === 'undefined') {
      console.error('❌ JsSIP library not found!');
      toast({
        title: "Erreur JsSIP",
        description: "La bibliothèque JsSIP n'est pas chargée",
        variant: "destructive"
      });
      return;
    }

    console.log('✅ JsSIP library loaded successfully');
    
    // Initialize SIP client
    const initSipClient = async () => {
      try {
        // Create hidden audio element
        if (!remoteAudioRef.current) {
          remoteAudioRef.current = new Audio();
          remoteAudioRef.current.autoplay = true;
          remoteAudioRef.current.style.display = 'none';
          document.body.appendChild(remoteAudioRef.current);
        }

        console.log('🔌 Initializing SIP connection to asterisk11.mooo.com:8089...');
        
        const socket = new JsSIP.WebSocketInterface('wss://asterisk11.mooo.com:8089/ws');
        
        const configuration = {
          sockets: [socket],
          uri: 'sip:6002@asterisk11.mooo.com:8089',
          password: 'NUrkdRpMubIe7Xrr',
          display_name: 'Commercial User',
          mediaConstraints: { audio: true, video: false },
          pcConfig: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' }
            ]
          }
        };

        console.log('📋 SIP Configuration:', {
          uri: configuration.uri,
          server: 'asterisk11.mooo.com:8089',
          websocket: 'wss://asterisk11.mooo.com:8089/ws'
        });

        uaRef.current = new JsSIP.UA(configuration);

        uaRef.current.on('registered', () => {
          setIsRegistered(true);
          console.log('✅ SIP registered successfully');
        });

        uaRef.current.on('registrationFailed', (e: any) => {
          console.error('❌ SIP registration failed:', e.cause);
          toast({
            title: "Erreur SIP",
            description: "Impossible de se connecter au serveur SIP",
            variant: "destructive"
          });
        });

        uaRef.current.on('newRTCSession', (data: any) => {
          const session = data.session;
          
          if (data.originator === 'remote') {
            // Auto-answer incoming calls
            session.answer({
              mediaConstraints: { audio: true, video: false }
            });
            sessionRef.current = session;
            setupCallEvents(session);
            setupRemoteAudio(session);
          }
        });

        uaRef.current.start();
        
      } catch (error) {
        console.error('Error initializing SIP client:', error);
        toast({
          title: "Erreur SIP",
          description: "Échec de l'initialisation SIP",
          variant: "destructive"
        });
      }
    };

    initSipClient();

    // Cleanup on unmount
    return () => {
      if (sessionRef.current) {
        sessionRef.current.terminate();
      }
      if (uaRef.current) {
        uaRef.current.stop();
      }
      if (remoteAudioRef.current && remoteAudioRef.current.parentNode) {
        remoteAudioRef.current.parentNode.removeChild(remoteAudioRef.current);
      }
     };
  }, [toast]);

  // Auto-call effect when autoCall prop is true
  useEffect(() => {
    if (autoCall && isRegistered && callState === 'idle' && phoneNumber) {
      console.log('🤖 Auto-calling:', phoneNumber);
      makeCall();
    }
  }, [autoCall, isRegistered, phoneNumber]);

  const setupRemoteAudio = (session: any) => {
    session.connection.addEventListener('track', (event: any) => {
      if (event.track.kind === 'audio' && event.streams && event.streams[0]) {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch((error) => {
            console.warn('Audio autoplay blocked:', error.message);
          });
        }
      }
    });
  };

  const setupCallEvents = (session: any) => {
    session.on('ended', () => {
      setCallState('ended');
      onCallStateChange?.('ended');
      sessionRef.current = null;
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = null;
      }
    });

    session.on('failed', (e: any) => {
      console.error('Call failed:', e.cause);
      setCallState('ended');
      onCallStateChange?.('ended');
      sessionRef.current = null;
      toast({
        title: "Appel échoué",
        description: `Erreur: ${e.cause}`,
        variant: "destructive"
      });
    });

    session.on('confirmed', () => {
      setCallState('connected');
      onCallStateChange?.('connected');
    });

    session.on('progress', () => {
      setCallState('ringing');
      onCallStateChange?.('ringing');
    });
  };

  // Sanitize phone number: remove spaces and add + prefix
  const sanitizePhoneNumber = (phone: string): string => {
    // Keep special numbers like *225 unchanged
    if (phone.startsWith('*')) {
      return phone;
    }
    
    // Remove all spaces
    const cleaned = phone.replace(/\s+/g, '');
    
    // Add + prefix if not already present
    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  };

  const makeCall = async () => {
    if (!uaRef.current || !isRegistered) {
      toast({
        title: "SIP non connecté",
        description: "Veuillez attendre la connexion SIP",
        variant: "destructive"
      });
      return;
    }

    if (!phoneNumber) {
      toast({
        title: "Numéro manquant",
        description: "Aucun numéro de téléphone fourni",
        variant: "destructive"
      });
      return;
    }

    try {
      setCallState('connecting');
      onCallStateChange?.('connecting');

      const sanitizedNumber = sanitizePhoneNumber(phoneNumber);
      const destination = phoneNumber === '*225' ? '*225' : sanitizedNumber;
      const sipUri = `sip:${destination}@asterisk11.mooo.com:8089`;

      console.log('📞 Phone number sanitized:', { original: phoneNumber, sanitized: sanitizedNumber });

      const options = {
        mediaConstraints: { audio: true, video: false },
        rtcOfferConstraints: {
          offerToReceiveAudio: true,
          offerToReceiveVideo: false
        }
      };

      sessionRef.current = uaRef.current.call(sipUri, options);
      setupCallEvents(sessionRef.current);
      setupRemoteAudio(sessionRef.current);

    } catch (error) {
      console.error('Error making call:', error);
      setCallState('ended');
      onCallStateChange?.('ended');
      toast({
        title: "Erreur d'appel",
        description: "Impossible d'initier l'appel",
        variant: "destructive"
      });
    }
  };

  const hangup = () => {
    if (sessionRef.current) {
      sessionRef.current.terminate();
      sessionRef.current = null;
    }
    setCallState('ended');
    onCallStateChange?.('ended');
  };

  const toggleMute = () => {
    if (sessionRef.current && callState === 'connected') {
      if (isMuted) {
        sessionRef.current.unmute();
      } else {
        sessionRef.current.mute();
      }
      setIsMuted(!isMuted);
    }
  };

  const getCallStateColor = () => {
    switch (callState) {
      case 'connecting': return 'text-yellow-400';
      case 'ringing': return 'text-blue-400';
      case 'connected': return 'text-green-400';
      case 'ended': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getCallStateText = () => {
    switch (callState) {
      case 'connecting': return 'Connexion...';
      case 'ringing': return 'Appel en cours...';
      case 'connected': return 'Connecté';
      case 'ended': return 'Terminé';
      default: return isRegistered ? 'Prêt' : 'Connexion SIP...';
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        {callState === 'idle' || callState === 'ended' ? (
          <Button
            onClick={makeCall}
            disabled={!isRegistered}
            size="lg"
            className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-green-600 hover:bg-green-700 text-white p-0 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 active:scale-95"
            title="Appeler"
            aria-label="Lancer l'appel"
          >
            {!isRegistered ? (
              <Loader2 className="h-7 w-7 sm:h-8 sm:w-8 animate-spin" />
            ) : (
              <Phone className="h-7 w-7 sm:h-8 sm:w-8" />
            )}
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={hangup}
              size="lg"
              className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-red-600 hover:bg-red-700 text-white p-0 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300"
              title="Raccrocher"
              aria-label="Raccrocher"
            >
              <PhoneOff className="h-7 w-7 sm:h-8 sm:w-8" />
            </Button>
            
            {callState === 'connected' && (
              <Button
                onClick={toggleMute}
                size="lg"
                className={`h-14 w-14 sm:h-16 sm:w-16 rounded-full ${
                  isMuted 
                    ? 'bg-yellow-600 hover:bg-yellow-700' 
                    : 'bg-gray-600 hover:bg-gray-700'
                } text-white p-0 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300`}
                title={isMuted ? "Activer le micro" : "Couper le micro"}
                aria-label={isMuted ? "Activer le micro" : "Couper le micro"}
              >
                {isMuted ? (
                  <MicOff className="h-7 w-7 sm:h-8 sm:w-8" />
                ) : (
                  <Mic className="h-7 w-7 sm:h-8 sm:w-8" />
                )}
              </Button>
            )}
          </div>
        )}
      </div>
      
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs sm:text-sm whitespace-nowrap">
        <span className={getCallStateColor()}>
          {getCallStateText()}
        </span>
      </div>
    </div>
  );
};

export default SimpleSipDialer;