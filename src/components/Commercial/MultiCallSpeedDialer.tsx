import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Phone, 
  PhoneOff, 
  Pause, 
  Play, 
  Volume2, 
  VolumeX,
  ArrowLeft,
  LogOut,
  UserCheck,
  Voicemail,
  Users,
  Clock,
  Settings,
  MoreVertical,
  Mic,
  MicOff,
  PhoneForwarded,
  Shuffle
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import SimpleSipDialer from './SimpleSipDialer';
import CallScript from './CallScript';
import * as JsSIP from 'jssip';

interface CallState {
  id: string;
  lead: any;
  status: 'dialing' | 'ringing' | 'connected' | 'voicemail' | 'ended' | 'on-hold';
  startTime?: Date;
  duration?: number;
  session?: any;
}

interface MultiCallSpeedDialerProps {
  commercial: any;
  onBack: () => void;
  onLogout: () => void;
  sipConfig?: any;
}

const MultiCallSpeedDialer: React.FC<MultiCallSpeedDialerProps> = ({
  commercial,
  onBack,
  onLogout,
  sipConfig
}) => {
  console.log('🎯 MultiCallSpeedDialer component rendered', { commercial: commercial?.id, name: commercial?.name });
  
  const { toast } = useToast();
  const [activeCalls, setActiveCalls] = useState<CallState[]>([]);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showScript, setShowScript] = useState(false);
  const [simultaneousCalls, setSimultaneousCalls] = useState(3);
  const [isDialing, setIsDialing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [holdMusic, setHoldMusic] = useState(true);
  const [autoVoicemail, setAutoVoicemail] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [sipManager, setSipManager] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Keep track of all active sessions separately for more reliable cleanup
  const activeSessionsRef = useRef<Set<any>>(new Set());
  
  console.log('🎯 MultiCallSpeedDialer state:', { 
    showScript, 
    selectedLead: selectedLead?.id, 
    isDialing,
    activeCallsCount: activeCalls.length 
  });

  // Fetch new leads
  const { data: newLeads, refetch: refetchLeads } = useQuery({
    queryKey: ['new-leads-speed-dial', commercial.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_contacts')
        .select('*')
        .eq('commercial_id', commercial.id)
        .eq('status', 'new')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch commercials for transfer
  const { data: commercials } = useQuery({
    queryKey: ['commercials-for-transfer'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commercials')
        .select('id, name')
        .neq('id', commercial.id);
      
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    // Initialize hold music
    if (audioRef.current) {
      audioRef.current.loop = true;
      audioRef.current.volume = 0.3;
    }

    // Initialize SIP connection
    initializeSIP();

    return () => {
      if (sipManager) {
        sipManager.destroy();
      }
    };
  }, []);

  const initializeSIP = async () => {
    try {
      // Use the correct SIP server configuration for WebRTC
      const sipServer = 'asterisk11.mooo.com'; // Use the domain for WebSocket connection
      const websocketPort = 8089; // WebSocket port for JsSIP
      const sipPort = 5060; // SIP port for actual calls
      const sipUsername = commercial.sip_username || '6001';
      const sipPassword = commercial.sip_password || 'NUrkdRpMubIe7Xrr';
      const sipDomain = commercial.sip_server || '13.38.136.149'; // Use IP for SIP calls

      console.log('🎯 Multi SIP: Initializing connection', {
        sipServer,
        websocketPort,
        sipPort,
        sipUsername,
        sipDomain,
        commercial: {
          sip_server: commercial.sip_server,
          sip_username: commercial.sip_username,
          sip_port: commercial.sip_port
        }
      });

      // Create WebSocket connection to Asterisk
      const socket = new JsSIP.WebSocketInterface(`wss://${sipServer}:${websocketPort}/ws`);
      const config = {
        sockets: [socket],
        uri: `sip:${sipUsername}@${sipDomain}:${sipPort}`,
        password: sipPassword,
        display_name: `Multi Speed Dialer - ${commercial.name}`,
        session_timers: false,
        register: true,
        register_expires: 300,
        connection_recovery_min_interval: 2,
        connection_recovery_max_interval: 30,
        use_preloaded_route: false
      };

      const ua = new JsSIP.UA(config);
      
      ua.on('connecting', () => {
        console.log('🔗 Multi SIP: Connecting...');
      });

      ua.on('connected', () => {
        console.log('✅ Multi SIP: Connected successfully');
        setIsConnected(true);
        toast({
          title: "SIP Connecté",
          description: "Connexion SIP établie avec succès",
          variant: "default"
        });
      });

      ua.on('disconnected', () => {
        console.log('❌ Multi SIP: Disconnected');
        setIsConnected(false);
        // Auto-reconnect attempt
        setTimeout(() => {
          if (ua && !ua.isConnected()) {
            console.log('🔄 Multi SIP: Attempting reconnection...');
            ua.start();
          }
        }, 3000);
      });

      ua.on('registered', () => {
        console.log('📞 Multi SIP: Registered successfully');
        setIsConnected(true);
      });

      ua.on('unregistered', () => {
        console.log('📞 Multi SIP: Unregistered');
        setIsConnected(false);
      });

      ua.on('registrationFailed', (e: any) => {
        console.error('❌ Multi SIP: Registration failed', e);
        setIsConnected(false);
        toast({
          title: "Erreur d'enregistrement SIP",
          description: `Échec de l'enregistrement: ${e.cause}`,
          variant: "destructive"
        });
      });

      // SIP connection events will be handled by the UA instance

      ua.start();
      setSipManager({ ua, config: { sipDomain, sipPort, sipServer, sipUsername, websocketPort } });
      
    } catch (error) {
      console.error('❌ Multi SIP: Initialization failed', error);
      setIsConnected(false);
      toast({
        title: "Erreur SIP",
        description: "Impossible d'initialiser la connexion SIP",
        variant: "destructive"
      });
    }
  };

  const sanitizePhoneNumber = (phone: string): string => {
    if (phone?.startsWith('*')) return phone;
    const cleaned = phone?.replace(/\s+/g, '') || '';
    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  };

  const pauseDialing = () => {
    setIsPaused(true);
    console.log('⏸️ MultiCall: Dialing paused');
  };

  const resumeDialing = () => {
    setIsPaused(false);
    console.log('▶️ MultiCall: Dialing resumed');
    
    // Continue dialing if we have capacity and leads
    const connectedCalls = activeCalls.filter(c => c.status === 'connected' || c.status === 'ringing').length;
    const availableSlots = simultaneousCalls - connectedCalls;
    
    if (availableSlots > 0 && newLeads && newLeads.length > 0) {
      // Start new calls to fill available slots
      for (let i = 0; i < Math.min(availableSlots, newLeads.length); i++) {
        if (newLeads[i]) {
          const newCall: CallState = {
            id: Math.random().toString(36).substr(2, 9),
            lead: newLeads[i],
            status: 'dialing',
            startTime: new Date()
          };
          setActiveCalls(prev => [...prev, newCall]);
          startSipCall(newCall);
        }
      }
    }
  };

  const startSpeedDialing = async () => {
    if (!newLeads || newLeads.length === 0) {
      toast({
        title: "Aucun lead",
        description: "Aucun lead avec le statut 'nouveau' trouvé",
        variant: "destructive"
      });
      return;
    }

    setIsDialing(true);
    setIsPaused(false);
    const leadsToCall = newLeads.slice(0, simultaneousCalls);
    
    // Start hold music if enabled
    if (holdMusic && audioRef.current) {
      audioRef.current.play().catch(console.error);
    }

    const newCalls: CallState[] = leadsToCall.map(lead => ({
      id: Math.random().toString(36).substr(2, 9),
      lead,
      status: 'dialing',
      startTime: new Date()
    }));

    setActiveCalls(newCalls);
    
    toast({
      title: "Speed Dial démarré",
      description: `Appel de ${leadsToCall.length} leads simultanément`,
    });

    // Start real SIP calls
    newCalls.forEach((call, index) => {
      setTimeout(() => {
        startSipCall(call);
      }, index * 1000); // Stagger calls by 1 second
    });
  };

  const handleCallConnected = async (lead: any) => {
    // Stop hold music
    if (audioRef.current) {
      audioRef.current.pause();
    }

    // Auto-adjust simultaneous calls based on connected calls
    const connectedCount = activeCalls.filter(c => c.status === 'connected').length + 1;
    if (connectedCount >= 2) {
      setSimultaneousCalls(Math.max(2, simultaneousCalls - 1));
    }

    // Store the lead but don't auto-open script
    setSelectedLead(lead);
    
    toast({
      title: "Appel connecté!",
      description: `${lead.name || lead.phone} a décroché - Cliquez sur 'Parler' pour ouvrir le script`,
      duration: 10000,
    });
  };

  const handleVoicemailDetected = async (lead: any) => {
    try {
      await supabase
        .from('marketing_contacts')
        .update({ status: 'voicemail' })
        .eq('id', lead.id);
      
      toast({
        title: "Messagerie détectée",
        description: `${lead.name || lead.phone} - Statut mis à jour`,
      });
      
      refetchLeads();
    } catch (error) {
      console.error('Error updating voicemail status:', error);
    }
  };

  const handleCallAction = (callId: string, action: 'hold' | 'hangup' | 'resume') => {
    const call = activeCalls.find(c => c.id === callId);
    if (!call) {
      console.error('❌ Multi SIP: Call not found for action', callId, action);
      return;
    }

    console.log('🎛️ Multi SIP: Performing action', action, 'on call', call.lead.phone);

    switch (action) {
      case 'hold':
        if (call.session && call.session.isEstablished()) {
          try {
            call.session.hold();
            console.log('🔇 Multi SIP: Call held', call.lead.phone);
          } catch (error) {
            console.error('❌ Multi SIP: Error holding call', call.lead.phone, error);
          }
        }
        setActiveCalls(prev => prev.map(c => 
          c.id === callId ? { ...c, status: 'on-hold' } : c
        ));
        // Play hold music for held calls
        if (holdMusic && audioRef.current) {
          audioRef.current.play().catch(console.error);
        }
        break;

      case 'resume':
        if (call.session && call.session.isEstablished()) {
          try {
            call.session.unhold();
            console.log('▶️ Multi SIP: Call resumed', call.lead.phone);
          } catch (error) {
            console.error('❌ Multi SIP: Error resuming call', call.lead.phone, error);
          }
        }
        setActiveCalls(prev => prev.map(c => 
          c.id === callId ? { ...c, status: 'connected' } : c
        ));
        // Stop hold music when resuming
        if (audioRef.current) {
          audioRef.current.pause();
        }
        break;

      case 'hangup':
        if (call.session) {
          try {
            call.session.terminate();
            activeSessionsRef.current.delete(call.session);
            console.log('📞 Multi SIP: Call terminated', call.lead.phone);
          } catch (error) {
            console.error('❌ Multi SIP: Error terminating call', call.lead.phone, error);
          }
        }
        setActiveCalls(prev => prev.map(c => 
          c.id === callId ? { ...c, status: 'ended' } : c
        ));
        break;

      default:
        console.error('❌ Multi SIP: Unknown action', action);
    }
  };

  const transferCall = async (callId: string, targetCommercial: any) => {
    const call = activeCalls.find(c => c.id === callId);
    if (!call) return;

    try {
      await supabase
        .from('marketing_contacts')
        .update({ commercial_id: targetCommercial.id })
        .eq('id', call.lead.id);

      setActiveCalls(prev => prev.filter(c => c.id !== callId));
      
      toast({
        title: "Appel transféré",
        description: `Lead transféré vers ${targetCommercial.name}`,
      });
      
      refetchLeads();
    } catch (error) {
      console.error('Error transferring call:', error);
      toast({
        title: "Erreur de transfert",
        description: "Impossible de transférer l'appel",
        variant: "destructive"
      });
    }
  };

  const startSipCall = async (call: CallState) => {
    if (!sipManager?.ua || !isConnected) {
      console.error('❌ Multi SIP: Cannot start call - SIP not connected');
      setActiveCalls(prev => prev.map(c => 
        c.id === call.id ? { ...c, status: 'ended' } : c
      ));
      toast({
        title: "Erreur d'appel",
        description: "SIP non connecté. Vérifiez la connexion.",
        variant: "destructive"
      });
      return;
    }

    try {
      const cleanPhone = sanitizePhoneNumber(call.lead.phone);
      // Use the SIP domain/IP for actual call routing
      const sipUri = `sip:${cleanPhone}@${sipManager.config.sipDomain}:${sipManager.config.sipPort}`;
      
      console.log('📞 Multi SIP: Starting call', {
        lead: call.lead.name,
        phone: call.lead.phone,
        cleanPhone,
        sipUri,
        sipManager: sipManager.config
      });
      
      setActiveCalls(prev => prev.map(c => 
        c.id === call.id ? { ...c, status: 'dialing' } : c
      ));

      const callOptions = {
        mediaConstraints: { 
          audio: true, 
          video: false 
        },
        pcConfig: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        },
        rtcOfferConstraints: {
          offerToReceiveAudio: 1,
          offerToReceiveVideo: 0
        }
      };

      const session = sipManager.ua.call(sipUri, callOptions);

      // Store session reference in both state and ref for reliable cleanup
      activeSessionsRef.current.add(session);
      setActiveCalls(prev => prev.map(c => 
        c.id === call.id ? { ...c, session } : c
      ));

      session.on('peerconnection', (e: any) => {
        console.log('📞 Multi SIP: Peer connection established for', call.lead.phone);
      });

      session.on('progress', () => {
        console.log('📞 Multi SIP: Call progress for', call.lead.phone);
        setActiveCalls(prev => prev.map(c => 
          c.id === call.id ? { ...c, status: 'ringing' } : c
        ));
      });

      session.on('accepted', () => {
        console.log('✅ Multi SIP: Call accepted for', call.lead.phone);
        setActiveCalls(prev => prev.map(c => 
          c.id === call.id ? { ...c, status: 'connected' } : c
        ));
        
        // Auto-hold all other active calls when one is answered
        setTimeout(() => {
          setActiveCalls(prev => prev.map(c => {
            if (c.id !== call.id && (c.status === 'connected' || c.status === 'ringing')) {
              if (c.session && c.session.isEstablished()) {
                try {
                  c.session.hold();
                  console.log('🔇 Multi SIP: Auto-held call', c.lead.phone);
                } catch (error) {
                  console.error('❌ Multi SIP: Error auto-holding call', c.lead.phone, error);
                }
              }
              return { ...c, status: 'on-hold' };
            }
            return c;
          }));
        }, 100);
        
        handleCallConnected(call.lead);
      });

      session.on('ended', () => {
        console.log('📞 Multi SIP: Call ended for', call.lead.phone);
        activeSessionsRef.current.delete(session);
        setActiveCalls(prev => prev.map(c => 
          c.id === call.id ? { ...c, status: 'ended' } : c
        ));
      });

      session.on('failed', (e: any) => {
        console.log('❌ Multi SIP: Call failed for', call.lead.phone, 'Reason:', e.cause);
        activeSessionsRef.current.delete(session);
        setActiveCalls(prev => prev.map(c => 
          c.id === call.id ? { ...c, status: 'ended' } : c
        ));
        
        // Auto-detect voicemail based on failure reason
        if (autoVoicemail && (e.cause === 'Busy' || e.cause === 'Request Timeout')) {
          handleVoicemailDetected(call.lead);
        }
      });

      // Add timeout handling
      setTimeout(() => {
        if (session && !session.isEstablished() && !session.isEnded()) {
          console.log('⏰ Multi SIP: Call timeout for', call.lead.phone);
          session.terminate();
        }
      }, 30000); // 30 second timeout

    } catch (error) {
      console.error('❌ Multi SIP: Error starting call for', call.lead.phone, error);
      setActiveCalls(prev => prev.map(c => 
        c.id === call.id ? { ...c, status: 'ended' } : c
      ));
      toast({
        title: "Erreur d'appel",
        description: `Impossible d'appeler ${call.lead.phone}`,
        variant: "destructive"
      });
    }
  };

  const stopAllCalls = () => {
    console.log('🛑 MultiCall: STOP ALL CALLS clicked - Current active calls:', activeCalls.length);
    console.log('🛑 MultiCall: Active sessions in ref:', activeSessionsRef.current.size);
    console.log('🛑 MultiCall: Active calls details:', activeCalls.map(c => ({ id: c.id, status: c.status, hasSession: !!c.session })));
    
    // First, stop any new calls from starting
    setIsDialing(false);
    setIsPaused(false);
    
    // Terminate all sessions from the ref (more reliable)
    console.log('🛑 MultiCall: Terminating all sessions from ref...');
    let terminatedCount = 0;
    activeSessionsRef.current.forEach((session) => {
      try {
        console.log('📞 MultiCall: Terminating session', terminatedCount + 1);
        session.terminate();
        terminatedCount++;
        console.log(`✅ MultiCall: Successfully terminated session ${terminatedCount}`);
      } catch (error) {
        console.error(`❌ MultiCall: Error terminating session ${terminatedCount + 1}:`, error);
      }
    });
    
    // Clear the sessions ref
    activeSessionsRef.current.clear();
    console.log(`🛑 MultiCall: Terminated ${terminatedCount} sessions from ref`);
    
    // Also terminate sessions from state (backup)
    activeCalls.forEach((call, index) => {
      console.log(`🛑 MultiCall: Processing call ${index + 1}/${activeCalls.length} - ID: ${call.id}, Status: ${call.status}`);
      
      if (call.session) {
        try {
          console.log(`📞 MultiCall: Terminating SIP session for call ${call.id}`);
          call.session.terminate();
          console.log(`✅ MultiCall: Successfully terminated session for call ${call.id}`);
        } catch (error) {
          console.error(`❌ MultiCall: Error terminating call ${call.id}:`, error);
        }
      } else {
        console.log(`⚠️ MultiCall: No session found for call ${call.id}`);
      }
    });

    console.log('🛑 MultiCall: Clearing all state');
    setActiveCalls([]);
    
    if (audioRef.current) {
      console.log('🔇 MultiCall: Stopping hold music');
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // Show confirmation that stop was successful
    toast({
      title: "Appels arrêtés",
      description: `${terminatedCount} appels actifs ont été terminés`,
      variant: "default"
    });
    
    console.log('🛑 MultiCall: STOP ALL CALLS completed');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'dialing': return 'bg-yellow-500';
      case 'ringing': return 'bg-blue-500';
      case 'connected': return 'bg-green-500';
      case 'voicemail': return 'bg-orange-500';
      case 'on-hold': return 'bg-purple-500';
      case 'ended': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'dialing': return <Phone className="h-3 w-3" />;
      case 'ringing': return <Phone className="h-3 w-3 animate-pulse" />;
      case 'connected': return <UserCheck className="h-3 w-3" />;
      case 'voicemail': return <Voicemail className="h-3 w-3" />;
      case 'on-hold': return <Pause className="h-3 w-3" />;
      case 'ended': return <PhoneOff className="h-3 w-3" />;
      default: return <Phone className="h-3 w-3" />;
    }
  };

  if (showScript && selectedLead) {
    return (
      <CallScript
        lead={selectedLead}
        commercial={commercial}
        onBack={() => {
          setShowScript(false);
          setSelectedLead(null);
        }}
        onLogout={onLogout}
        onNextLead={(successful) => {
          // Handle next lead logic for speed dial
          setShowScript(false);
          setSelectedLead(null);
          if (successful) {
            // Continue with remaining calls or start new batch
            const remainingNewCalls = activeCalls.filter(c => c.status === 'ringing' || c.status === 'dialing');
            if (remainingNewCalls.length === 0) {
              startSpeedDialing();
            }
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white p-4">
      {/* Background Audio */}
      <audio ref={audioRef} preload="auto">
        <source src="/hold-music.mp3" type="audio/mpeg" />
        {/* Fallback hold music URL */}
        <source src="https://www.soundjay.com/misc/sounds/bell-ringing-05.wav" type="audio/wav" />
      </audio>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <Button
              onClick={onBack}
              variant="outline"
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-800 self-start"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                Speed Dialer Multi-Appels
              </h1>
              <p className="text-sm sm:text-base text-gray-400 truncate">
                Appels simultanés de leads • Commercial
              </p>
            </div>
          </div>
          <Button onClick={onLogout} variant="outline" size="sm" className="self-start sm:self-auto">
            <LogOut className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Déconnexion</span>
            <span className="sm:hidden">Sortir</span>
          </Button>
        </div>

        {/* Control Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Main Controls */}
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Settings className="h-5 w-5" />
                Contrôles Principaux
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Appels simultanés:</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSimultaneousCalls(Math.max(1, simultaneousCalls - 1))}
                    disabled={isDialing}
                  >
                    -
                  </Button>
                  <span className="w-8 text-center font-bold">{simultaneousCalls}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSimultaneousCalls(Math.min(10, simultaneousCalls + 1))}
                    disabled={isDialing}
                  >
                    +
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Musique d'attente:</span>
                <Button
                  size="sm"
                  variant={holdMusic ? "default" : "outline"}
                  onClick={() => setHoldMusic(!holdMusic)}
                >
                  {holdMusic ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Auto messagerie:</span>
                <Button
                  size="sm"
                  variant={autoVoicemail ? "default" : "outline"}
                  onClick={() => setAutoVoicemail(!autoVoicemail)}
                >
                  {autoVoicemail ? <Voicemail className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </Button>
              </div>

              <div className="space-y-2">
                {/* Main Start/Stop Button */}
                <Button
                  onClick={() => {
                    console.log('🔘 MultiCall: Button clicked - isDialing:', isDialing);
                    if (isDialing) {
                      console.log('🛑 MultiCall: Calling stopAllCalls()');
                      stopAllCalls();
                    } else {
                      console.log('🚀 MultiCall: Calling startSpeedDialing()');
                      startSpeedDialing();
                    }
                  }}
                  className={`w-full ${isDialing 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700'
                  }`}
                  size="lg"
                  disabled={!newLeads || newLeads.length === 0 || !isConnected}
                >
                  {isDialing ? (
                    <>
                      <PhoneOff className="h-5 w-5 mr-2" />
                      Arrêter tous les appels
                    </>
                  ) : (
                    <>
                      <Shuffle className="h-5 w-5 mr-2" />
                      Démarrer Speed Dial
                    </>
                  )}
                </Button>

                {/* Pause/Resume Button - Only show when dialing */}
                {isDialing && (
                  <Button
                    onClick={isPaused ? resumeDialing : pauseDialing}
                    className={`w-full ${isPaused 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-yellow-600 hover:bg-yellow-700'
                    }`}
                    size="sm"
                  >
                    {isPaused ? (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Reprendre
                      </>
                    ) : (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Pause
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="h-5 w-5" />
                Statistiques
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-300">Leads disponibles:</span>
                <span className="font-bold text-green-400">{newLeads?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Appels actifs:</span>
                <span className="font-bold text-blue-400">{activeCalls.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Connectés:</span>
                <span className="font-bold text-green-400">
                  {activeCalls.filter(c => c.status === 'connected').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">En attente:</span>
                <span className="font-bold text-purple-400">
                  {activeCalls.filter(c => c.status === 'on-hold').length}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Clock className="h-5 w-5" />
                Actions Rapides
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => setActiveCalls(prev => prev.map(c => ({ ...c, status: 'on-hold' })))}
                variant="outline"
                className="w-full"
                disabled={activeCalls.length === 0}
              >
                <Pause className="h-4 w-4 mr-2" />
                Mettre tous en attente
              </Button>
              <Button
                onClick={() => setActiveCalls(prev => prev.map(c => 
                  c.status === 'on-hold' ? { ...c, status: 'connected' } : c
                ))}
                variant="outline"
                className="w-full"
                disabled={activeCalls.filter(c => c.status === 'on-hold').length === 0}
              >
                <Play className="h-4 w-4 mr-2" />
                Reprendre tous
              </Button>
              <Button
                onClick={() => refetchLeads()}
                variant="outline"
                className="w-full"
              >
                <Shuffle className="h-4 w-4 mr-2" />
                Actualiser leads
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Active Calls Grid */}
        {activeCalls.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 text-white">Appels Actifs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {activeCalls.map((call) => (
                <Card key={call.id} className="bg-gray-800/70 border-gray-600 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge className={`${getStatusColor(call.status)} text-white`}>
                        {getStatusIcon(call.status)}
                        <span className="ml-1 capitalize">{call.status}</span>
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {call.status === 'connected' && (
                            <DropdownMenuItem onClick={() => handleCallAction(call.id, 'hold')}>
                              <Pause className="h-4 w-4 mr-2" />
                              Mettre en attente
                            </DropdownMenuItem>
                          )}
                          {call.status === 'on-hold' && (
                            <DropdownMenuItem onClick={() => handleCallAction(call.id, 'resume')}>
                              <Play className="h-4 w-4 mr-2" />
                              Reprendre
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleCallAction(call.id, 'hangup')}>
                            <PhoneOff className="h-4 w-4 mr-2" />
                            Raccrocher
                          </DropdownMenuItem>
                          {(call.status === 'connected' || call.status === 'on-hold') && commercials && (
                            <>
                              <div className="border-t my-1" />
                              {commercials.map((comm) => (
                                <DropdownMenuItem 
                                  key={comm.id}
                                  onClick={() => transferCall(call.id, comm)}
                                >
                                  <PhoneForwarded className="h-4 w-4 mr-2" />
                                  Transférer à {comm.name}
                                </DropdownMenuItem>
                              ))}
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <p className="font-semibold text-white truncate">
                        {call.lead.name || 'Lead sans nom'}
                      </p>
                      <p className="text-sm text-gray-400 truncate">
                        {sanitizePhoneNumber(call.lead.phone)}
                      </p>
                      {(call.lead as any).company && (
                        <p className="text-xs text-gray-500 truncate">
                          {(call.lead as any).company}
                        </p>
                      )}
                      {call.startTime && (
                        <p className="text-xs text-gray-400">
                          Durée: {Math.floor((new Date().getTime() - call.startTime.getTime()) / 1000)}s
                        </p>
                      )}
                      {call.status === 'connected' && (
                        <Button
                          size="sm"
                          className="w-full bg-yellow-600 hover:bg-yellow-700"
                          onClick={() => {
                            setSelectedLead(call.lead);
                            setShowScript(true);
                          }}
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Parler - Ouvrir Script
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Available Leads Preview */}
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="h-5 w-5" />
              Leads Disponibles ({newLeads?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {newLeads && newLeads.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                {newLeads.slice(0, 20).map((lead) => (
                  <div key={lead.id} className="bg-gray-700/50 rounded-lg p-3">
                    <p className="font-medium text-white truncate">
                      {lead.name || 'Lead sans nom'}
                    </p>
                    <p className="text-sm text-gray-400 truncate">
                      {sanitizePhoneNumber(lead.phone)}
                    </p>
                    {(lead as any).company && (
                      <p className="text-xs text-gray-500 truncate">
                        {(lead as any).company}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun lead avec le statut "nouveau" disponible</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MultiCallSpeedDialer;