import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Phone, PhoneOff, Users, Play, Square, VolumeX, Pause, FileText, Timer } from 'lucide-react';
// @ts-ignore - JsSIP types not available
import * as JsSIP from 'jssip';
import CallScript from './CallScript';

interface ProfessionalSpeedDialerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commercial: any;
}

interface Lead {
  id: string;
  name: string;
  first_name: string;
  phone: string;
  status: string;
}

interface Call {
  id: string;
  lead: Lead;
  state: 'dialing' | 'ringing' | 'connected' | 'ended';
  startTime: number;
  connectTime?: number;
  duration: number;
}

// Simplified SIP Manager - Single instance, better lifecycle
class SimpleSIPManager {
  private ua: any = null;
  private activeSession: any = null;
  private isRegistered = false;
  private onStateChange: (state: string, details?: any) => void;
  private remoteAudio: HTMLAudioElement;
  private sipDomain: string = '';
  private sipPort: number = 8089;
  
  constructor(onStateChange: (state: string, details?: any) => void) {
    this.onStateChange = onStateChange;
    this.remoteAudio = new Audio();
    this.remoteAudio.autoplay = true;
    document.body.appendChild(this.remoteAudio);
  }

  async connect(commercial?: any): Promise<void> {
    if (this.ua) return; // Already connected
    
    this.onStateChange('connecting');
    
    // Use the correct SIP server configuration for WebRTC
    const sipServer = 'asterisk11.mooo.com'; // Use the domain for WebSocket connection
    const websocketPort = 8089; // WebSocket port for JsSIP
    const sipPort = 5060; // SIP port for actual calls
    const sipUsername = commercial?.sip_username || '6001';
    const sipPassword = commercial?.sip_password || 'NUrkdRpMubIe7Xrr';
    const sipDomain = commercial?.sip_server || '13.38.136.149'; // Use IP for SIP calls
    
    console.log('📞 Professional Dialer: Initializing SIP connection', {
      sipServer,
      websocketPort,
      sipPort,
      sipUsername,
      sipDomain,
      commercial: {
        sip_server: commercial?.sip_server,
        sip_username: commercial?.sip_username,
        sip_port: commercial?.sip_port
      }
    });
    
    const socket = new JsSIP.WebSocketInterface(`wss://${sipServer}:${websocketPort}/ws`);
    const config = {
      sockets: [socket],
      uri: `sip:${sipUsername}@${sipDomain}:${sipPort}`,
      password: sipPassword,
      display_name: `Professional Speed Dialer - ${commercial?.name || 'Unknown'}`,
      session_timers: false,
      register: true,
      register_expires: 300,
      connection_recovery_min_interval: 2,
      connection_recovery_max_interval: 30,
      use_preloaded_route: false
    };

    // Store SIP config for call routing
    this.sipDomain = sipDomain;
    this.sipPort = sipPort;
    
    this.ua = new JsSIP.UA(config);
    
    return new Promise((resolve, reject) => {
      this.ua.on('connecting', () => {
        console.log('📞 Professional Dialer: Connecting...');
      });

      this.ua.on('connected', () => {
        console.log('📞 Professional Dialer: ✅ Connected successfully');
        this.onStateChange('connected');
      });

      this.ua.on('registered', () => {
        console.log('📞 Professional Dialer: ✅ Registered successfully');
        this.isRegistered = true;
        this.onStateChange('registered');
        resolve();
      });

      this.ua.on('registrationFailed', (e: any) => {
        console.error('📞 Professional Dialer: ❌ Registration failed', e);
        this.onStateChange('error', `Registration failed: ${e.cause}`);
        reject(new Error(e.cause));
      });

      this.ua.on('disconnected', () => {
        console.log('📞 Professional Dialer: ❌ Disconnected');
        this.isRegistered = false;
        this.onStateChange('disconnected');
        // Auto-reconnect attempt
        setTimeout(() => {
          if (this.ua && !this.ua.isConnected()) {
            console.log('📞 Professional Dialer: 🔄 Attempting reconnection...');
            this.ua.start();
          }
        }, 3000);
      });

      this.ua.start();
    });
  }

  async call(phoneNumber: string): Promise<void> {
    if (!this.isRegistered) throw new Error('Not registered');
    if (this.activeSession) throw new Error('Call already active');

    // Clean and format phone number properly
    const cleanPhone = phoneNumber.replace(/\s+/g, '');
    const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;
    const sipUri = `sip:${formattedPhone}@${this.sipDomain}:${this.sipPort}`;
    
    console.log('📞 Professional Dialer: Starting call', {
      originalPhone: phoneNumber,
      cleanPhone,
      formattedPhone,
      sipUri,
      sipDomain: this.sipDomain,
      sipPort: this.sipPort
    });
    
    this.onStateChange('dialing', { phone: phoneNumber });
    
    const options = {
      mediaConstraints: { audio: true, video: false },
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

    this.activeSession = this.ua.call(sipUri, options);
    
    this.activeSession.on('peerconnection', (e: any) => {
      console.log('📞 Professional Dialer: Peer connection established');
    });
    
    this.activeSession.on('progress', () => {
      console.log('📞 Professional Dialer: Call progress - ringing');
      this.onStateChange('ringing');
    });

    this.activeSession.on('confirmed', () => {
      console.log('📞 Professional Dialer: Call confirmed - connected');
      this.onStateChange('connected');
      this.setupAudio();
    });

    this.activeSession.on('ended', () => {
      console.log('📞 Professional Dialer: Call ended');
      this.onStateChange('ended');
      this.cleanup();
    });

    this.activeSession.on('failed', (e: any) => {
      console.log('📞 Professional Dialer: Call failed', e.cause);
      this.onStateChange('failed', e.cause);
      this.cleanup();
    });

    // Add timeout handling
    setTimeout(() => {
      if (this.activeSession && !this.activeSession.isEstablished() && !this.activeSession.isEnded()) {
        console.log('📞 Professional Dialer: Call timeout - terminating');
        this.activeSession.terminate();
      }
    }, 30000); // 30 second timeout
  }

  private setupAudio() {
    if (!this.activeSession) return;
    
    this.activeSession.connection.addEventListener('track', (event: any) => {
      if (event.track.kind === 'audio' && event.streams[0]) {
        this.remoteAudio.srcObject = event.streams[0];
        this.remoteAudio.play().catch(() => {});
      }
    });
  }

  hangup() {
    if (this.activeSession) {
      this.activeSession.terminate();
    }
    this.cleanup();
  }

  mute(muted: boolean) {
    if (this.activeSession) {
      if (muted) {
        this.activeSession.mute();
      } else {
        this.activeSession.unmute();
      }
    }
  }

  private cleanup() {
    this.activeSession = null;
    if (this.remoteAudio) {
      this.remoteAudio.srcObject = null;
    }
  }

  destroy() {
    this.hangup();
    if (this.ua) {
      this.ua.stop();
      this.ua = null;
    }
    if (this.remoteAudio?.parentNode) {
      this.remoteAudio.parentNode.removeChild(this.remoteAudio);
    }
  }
}

const ProfessionalSpeedDialer: React.FC<ProfessionalSpeedDialerProps> = ({ 
  open, 
  onOpenChange, 
  commercial 
}) => {
  // Core state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [currentCall, setCurrentCall] = useState<Call | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [stats, setStats] = useState({ 
    total: 0, 
    connected: 0, 
    voicemail: 0, 
    failed: 0 
  });
  
  // Script lightbox
  const [showScript, setShowScript] = useState(false);
  const [scriptLead, setScriptLead] = useState<Lead | null>(null);
  
  // SIP Manager ref
  const sipManagerRef = useRef<SimpleSIPManager | null>(null);
  const currentLeadIndexRef = useRef(0);
  const callTimerRef = useRef<NodeJS.Timeout>();

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log('📞 Professional Dialer:', message);
    setLogs(prev => [`${timestamp} • ${message}`, ...prev.slice(0, 50)]);
  }, []);

  // Load leads
  const loadLeads = useCallback(async () => {
    if (!commercial?.id) return;
    
    addLog('Loading leads...');
    const { data, error } = await supabase
      .from('marketing_contacts')
      .select('id, name, first_name, phone, status')
      .eq('commercial_id', commercial.id)
      .in('status', ['new', 'callback', 'not_answering_1', 'not_answering_2', 'interested'])
      .limit(100);

    if (error) {
      addLog(`Error loading leads: ${error.message}`);
      return;
    }

    // Shuffle leads for randomization
    const shuffled = [...(data || [])].sort(() => Math.random() - 0.5);
    setLeads(shuffled);
    addLog(`Loaded ${shuffled.length} leads for dialing`);
  }, [commercial?.id, addLog]);

  // Initialize SIP Manager
  const initSIP = useCallback(async () => {
    if (sipManagerRef.current) return;

    addLog('Initializing SIP connection...');
    
    const manager = new SimpleSIPManager((state, details) => {
      if (state === 'connecting') {
        addLog('Connecting to SIP server...');
      } else if (state === 'registered') {
        addLog('✅ SIP registered successfully');
      } else if (state === 'disconnected') {
        addLog('⚠️ SIP disconnected');
      } else if (state === 'error') {
        addLog(`❌ SIP error: ${details}`);
      } else if (state === 'dialing') {
        addLog(`📞 Dialing ${details.phone}...`);
        if (currentCall) {
          setCurrentCall(prev => prev ? { ...prev, state: 'dialing' } : null);
        }
      } else if (state === 'ringing') {
        addLog('📞 Ringing...');
        if (currentCall) {
          setCurrentCall(prev => prev ? { ...prev, state: 'ringing' } : null);
        }
      } else if (state === 'connected') {
        addLog('🎉 Call connected!');
        if (currentCall) {
          const connectTime = Date.now();
          setCurrentCall(prev => prev ? { 
            ...prev, 
            state: 'connected', 
            connectTime 
          } : null);
          setStats(prev => ({ ...prev, connected: prev.connected + 1 }));
          
          // Auto-pause on connection
          setIsPaused(true);
          addLog('⏸️ Auto-paused - person answered');
        }
      } else if (state === 'ended' || state === 'failed') {
        const wasConnected = currentCall?.state === 'connected';
        const duration = currentCall?.connectTime ? 
          Math.round((Date.now() - currentCall.connectTime) / 1000) : 0;
          
        if (wasConnected) {
          addLog(`✅ Call completed (${duration}s)`);
        } else {
          addLog('📵 No answer - marked as voicemail');
          if (currentCall) {
            // Mark as voicemail in database
            supabase
              .from('marketing_contacts')
              .update({ status: 'voicemail' })
              .eq('id', currentCall.lead.id);
            setStats(prev => ({ ...prev, voicemail: prev.voicemail + 1 }));
          }
        }
        
        setCurrentCall(null);
        
        // Move to next call after delay
        setTimeout(() => {
          if (isRunning && !isPaused) {
            nextCall();
          }
        }, 2000);
      }
    });

    try {
      await manager.connect(commercial);
      sipManagerRef.current = manager;
    } catch (error) {
      addLog(`Failed to initialize SIP: ${error}`);
    }
  }, [currentCall, isRunning, isPaused, addLog]);

  // Start next call
  const nextCall = useCallback(async () => {
    if (!sipManagerRef.current || currentCall || isPaused || !isRunning) return;
    if (currentLeadIndexRef.current >= leads.length) {
      addLog('🏁 All leads completed');
      setIsRunning(false);
      return;
    }

    const lead = leads[currentLeadIndexRef.current];
    currentLeadIndexRef.current++;

    const newCall: Call = {
      id: lead.id,
      lead,
      state: 'dialing',
      startTime: Date.now(),
      duration: 0
    };

    setCurrentCall(newCall);
    setStats(prev => ({ ...prev, total: prev.total + 1 }));

    try {
      await sipManagerRef.current.call(lead.phone);
    } catch (error) {
      addLog(`Failed to call ${lead.first_name}: ${error}`);
      setStats(prev => ({ ...prev, failed: prev.failed + 1 }));
      setCurrentCall(null);
      setTimeout(nextCall, 1000);
    }
  }, [leads, currentCall, isPaused, isRunning, addLog]);

  // Start dialing
  const startDialing = useCallback(async () => {
    if (!leads.length) {
      await loadLeads();
      return;
    }

    addLog('🚀 Starting Professional Speed Dialer');
    currentLeadIndexRef.current = 0;
    setStats({ total: 0, connected: 0, voicemail: 0, failed: 0 });
    setIsRunning(true);
    setIsPaused(false);

    if (!sipManagerRef.current) {
      await initSIP();
    }

    setTimeout(nextCall, 1000);
  }, [leads.length, loadLeads, addLog, initSIP, nextCall]);

  // Stop dialing
  const stopDialing = useCallback(() => {
    addLog('⏹️ Stopping dialer');
    setIsRunning(false);
    setIsPaused(false);
    
    if (sipManagerRef.current && currentCall) {
      sipManagerRef.current.hangup();
    }
    setCurrentCall(null);
  }, [addLog, currentCall]);

  // Toggle pause
  const togglePause = useCallback(() => {
    const newPaused = !isPaused;
    setIsPaused(newPaused);
    addLog(newPaused ? '⏸️ Dialer paused' : '▶️ Dialer resumed');
    
    if (!newPaused && isRunning && !currentCall) {
      setTimeout(nextCall, 1000);
    }
  }, [isPaused, isRunning, currentCall, addLog, nextCall]);

  // Hangup current call
  const hangupCall = useCallback(() => {
    if (sipManagerRef.current && currentCall) {
      sipManagerRef.current.hangup();
      addLog('📞 Call ended manually');
    }
  }, [currentCall, addLog]);

  // Show script for current lead
  const showScriptForLead = useCallback(() => {
    if (currentCall?.lead) {
      setScriptLead(currentCall.lead);
      setShowScript(true);
    }
  }, [currentCall]);

  // Update call duration timer
  useEffect(() => {
    if (currentCall?.state === 'connected' && currentCall.connectTime) {
      callTimerRef.current = setInterval(() => {
        setCurrentCall(prev => {
          if (prev?.connectTime) {
            return {
              ...prev,
              duration: Math.round((Date.now() - prev.connectTime) / 1000)
            };
          }
          return prev;
        });
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = undefined;
      }
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [currentCall?.state, currentCall?.connectTime]);

  // Load leads on open
  useEffect(() => {
    if (open) {
      loadLeads();
    } else {
      // Cleanup when closing
      stopDialing();
      if (sipManagerRef.current) {
        sipManagerRef.current.destroy();
        sipManagerRef.current = null;
      }
    }
  }, [open, loadLeads, stopDialing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sipManagerRef.current) {
        sipManagerRef.current.destroy();
      }
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-gradient-to-br from-gray-900 to-gray-800 border border-yellow-500/20 text-white max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-yellow-400 flex items-center gap-3 text-xl">
              <div className="bg-yellow-500/20 p-2 rounded-lg">
                <Users className="h-6 w-6" />
              </div>
              🎯 Professional Speed Dialer
              <div className="text-sm bg-green-500/20 px-3 py-1 rounded-full border border-green-500/30 ml-auto">
                {leads.length} leads loaded
                {isPaused && <span className="ml-2 text-yellow-300">⏸️ PAUSED</span>}
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Control Panel */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {!isRunning ? (
              <Button 
                onClick={startDialing} 
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold"
                disabled={leads.length === 0}
              >
                <Play className="h-4 w-4 mr-2" /> Start Dialing
              </Button>
            ) : (
              <>
                <Button 
                  onClick={togglePause}
                  variant="outline"
                  className={`border-gray-600 ${isPaused ? 'text-green-400' : 'text-yellow-400'} hover:bg-gray-700`}
                >
                  {isPaused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
                  {isPaused ? 'Resume' : 'Pause'}
                </Button>
                <Button 
                  onClick={stopDialing}
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Square className="h-4 w-4 mr-2" /> Stop
                </Button>
              </>
            )}
            
            <Button 
              onClick={loadLeads}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Refresh Leads
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-blue-400">{stats.total}</div>
                <div className="text-xs text-gray-400">Total Calls</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-green-400">{stats.connected}</div>
                <div className="text-xs text-gray-400">Connected</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-yellow-400">{stats.voicemail}</div>
                <div className="text-xs text-gray-400">Voicemail</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
                <div className="text-xs text-gray-400">Failed</div>
              </CardContent>
            </Card>
          </div>

          {/* Current Call */}
          {currentCall && (
            <Card className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-500/30 mb-4">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold text-white">
                      {currentCall.lead.first_name} {currentCall.lead.name}
                    </div>
                    <div className="text-sm text-gray-300">{currentCall.lead.phone}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        currentCall.state === 'connected' ? 'bg-green-500/20 text-green-400' :
                        currentCall.state === 'ringing' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {currentCall.state === 'connected' ? '🟢 Connected' :
                         currentCall.state === 'ringing' ? '🟡 Ringing' :
                         '🔵 Dialing'}
                      </span>
                      {currentCall.state === 'connected' && (
                        <span className="text-green-400 text-sm flex items-center gap-1">
                          <Timer className="h-3 w-3" />
                          {formatDuration(currentCall.duration)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {currentCall.state === 'connected' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-blue-600 text-blue-400 hover:bg-blue-600/20"
                          onClick={showScriptForLead}
                        >
                          <FileText className="h-4 w-4 mr-1" /> Script
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-gray-600 text-gray-300 hover:bg-gray-700"
                          onClick={() => sipManagerRef.current?.mute(true)}
                        >
                          <VolumeX className="h-4 w-4 mr-1" /> Mute
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={hangupCall}
                    >
                      <PhoneOff className="h-4 w-4 mr-1" /> Hangup
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Activity Log */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-300">Activity Log</span>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setLogs([])}
                  className="text-gray-400 hover:text-white"
                >
                  Clear
                </Button>
              </div>
              <div className="max-h-48 overflow-auto bg-black/20 rounded p-3">
                {logs.length === 0 ? (
                  <div className="text-center text-gray-500 py-4">
                    Ready to start professional dialing
                  </div>
                ) : (
                  <div className="space-y-1 text-xs font-mono">
                    {logs.map((log, i) => (
                      <div 
                        key={i} 
                        className={`${
                          log.includes('✅') || log.includes('🎉') ? 'text-green-400' :
                          log.includes('❌') ? 'text-red-400' :
                          log.includes('📞') ? 'text-blue-400' :
                          log.includes('🚀') ? 'text-yellow-400' :
                          'text-gray-400'
                        }`}
                      >
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>

      {/* Script Lightbox */}
      {showScript && scriptLead && (
        <Dialog open={showScript} onOpenChange={setShowScript}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
            <CallScript
              lead={scriptLead}
              commercial={commercial}
              onBack={() => setShowScript(false)}
              onLogout={() => {}}
              onNextLead={() => {}}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default ProfessionalSpeedDialer;