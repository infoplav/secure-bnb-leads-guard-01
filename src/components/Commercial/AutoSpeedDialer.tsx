import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Phone, PhoneOff, Users, Play, Square, VolumeX, ArrowRight, RefreshCw, Share2, Pause, FileText } from 'lucide-react';
// @ts-ignore - JsSIP types not available
import * as JsSIP from 'jssip';
import CallScript from './CallScript';

interface AutoSpeedDialerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commercial: any;
  initialConcurrency?: number; // 3-5
  onLeadConnected?: (lead: LeadItem) => void;
}

// Pure JsSIP client for real SIP calling
class SipClient {
  private ua: any = null;
  private session: any = null;
  private remoteAudio: HTMLAudioElement | null = null;
  private state: 'idle'|'connecting'|'ringing'|'connected'|'ended' = 'idle';
  private onState: (state: 'idle'|'connecting'|'ringing'|'connected'|'ended') => void;
  private onLog?: (msg: string) => void;
  private callStartTime: Date | null = null;
  private isMuted: boolean = false;
  private isHeld: boolean = false;
  private isRegistered: boolean = false;
  private connectionAttempts: number = 0;
  private maxConnectionAttempts: number = 3;

  constructor(onState: (state: 'idle'|'connecting'|'ringing'|'connected'|'ended') => void, onLog?: (msg: string) => void) {
    this.onState = onState;
    this.onLog = onLog;
    this.initializeAudio();
  }

  private initializeAudio() {
    this.remoteAudio = new Audio();
    this.remoteAudio.autoplay = true;
    this.remoteAudio.controls = false;
    // Enable audio playback
    this.remoteAudio.style.display = 'none';
    document.body.appendChild(this.remoteAudio);
  }

  async initialize() {
    return new Promise<void>((resolve, reject) => {
      try {
        // Check if JsSIP is loaded
        if (typeof JsSIP === 'undefined') {
          this.onLog?.('❌ JsSIP library not found!');
          reject(new Error('JsSIP library not loaded'));
          return;
        }

        this.onLog?.('✅ JsSIP library loaded successfully');
        this.onLog?.('🔌 Connecting to SIP server asterisk11.mooo.com:8089...');
        this.onState('connecting');
        this.connectionAttempts++;

        // Configure JsSIP WebSocket
        const socket = new JsSIP.WebSocketInterface(`wss://asterisk11.mooo.com:8089/ws`);
        
        const configuration = {
          sockets: [socket],
          uri: `sip:6002@asterisk11.mooo.com:8089`,
          password: 'NUrkdRpMubIe7Xrr',
          display_name: 'Commercial User',
          mediaConstraints: { audio: true, video: false },
          rtcpMuxPolicy: 'require',
          pcConfig: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' }
            ]
          }
        };

        this.onLog?.('📋 SIP Configuration: 6002@asterisk11.mooo.com:8089');
        this.ua = new JsSIP.UA(configuration);

        // Handle successful registration
        this.ua.on('registered', () => {
          this.isRegistered = true;
          this.onLog?.('✅ Successfully registered to SIP server!');
          this.onState('idle');
          this.connectionAttempts = 0;
          resolve();
        });

        // Handle registration failures
        this.ua.on('registrationFailed', (e: any) => {
          this.onLog?.(`❌ SIP registration failed: ${e.cause}`);
          if (this.connectionAttempts < this.maxConnectionAttempts) {
            this.onLog?.(`🔄 Retrying connection (${this.connectionAttempts}/${this.maxConnectionAttempts})`);
            setTimeout(() => {
              this.initialize().then(resolve).catch(reject);
            }, 2000);
          } else {
            this.onState('ended');
            reject(new Error(`Registration failed after ${this.maxConnectionAttempts} attempts: ${e.cause}`));
          }
        });

        // Handle disconnection
        this.ua.on('disconnected', () => {
          this.onLog?.('🔌 SIP connection lost');
          this.isRegistered = false;
        });

        // Handle connection events
        this.ua.on('connected', () => {
          this.onLog?.('🔗 SIP WebSocket connected to asterisk11.mooo.com:8089');
        });

        // Handle incoming calls
        this.ua.on('newRTCSession', (data: any) => {
          const session = data.session;
          
          if (data.originator === 'remote') {
            this.onLog?.(`📞 Incoming call from ${session.remote_identity.uri.user}`);
            
            // Auto-answer incoming calls
            session.answer({
              mediaConstraints: { audio: true, video: false }
            });
            
            this.session = session;
            this.onLog?.('📞 Auto-answered incoming call');
            this.setupCallEvents(session);
            this.setupRemoteAudio(session);
          }
        });

        // Start the UA
        this.ua.start();
        this.onLog?.('🚀 SIP UA started, waiting for registration...');
        
      } catch (err: any) {
        this.onLog?.(`💥 SIP initialization failed: ${err?.message || err}`);
        this.onState('ended');
        reject(err);
      }
    });
  }

  private setupRemoteAudio(session: any) {
    this.onLog?.('🎵 Setting up remote audio stream...');
    
    session.connection.addEventListener('track', (event: any) => {
      this.onLog?.('🔊 Remote audio track received');
      
      if (event.track.kind === 'audio' && event.streams && event.streams[0]) {
        const remoteStream = event.streams[0];
        
        if (this.remoteAudio) {
          this.remoteAudio.srcObject = remoteStream;
          
          // Force audio play with user interaction handling
          const playAudio = () => {
            this.remoteAudio!.play().then(() => {
              this.onLog?.('✅ Remote audio is playing');
            }).catch((error) => {
              this.onLog?.(`⚠️ Audio play failed: ${error.message}`);
              // Try to enable audio on next user interaction
              document.addEventListener('click', () => {
                this.remoteAudio!.play().catch(() => {});
              }, { once: true });
            });
          };

          this.remoteAudio.onloadedmetadata = playAudio;
          if (this.remoteAudio.readyState >= 1) {
            playAudio();
          }
        }
      }
    });
  }

  private setupCallEvents(session: any) {
    session.on('ended', () => {
      this.onLog?.('📞 Call ended');
      this.state = 'ended';
      this.onState('ended');
      this.cleanupCall();
    });

    session.on('failed', (e: any) => {
      this.onLog?.(`❌ Call failed: ${e.cause}`);
      this.state = 'ended';
      this.onState('ended');
      this.cleanupCall();
    });

    session.on('confirmed', () => {
      this.onLog?.('✅ Call confirmed and connected');
      this.state = 'connected';
      this.onState('connected');
      this.callStartTime = new Date();
    });

    session.on('connecting', () => {
      this.onLog?.('🔄 Call connecting...');
      this.state = 'connecting';
      this.onState('connecting');
    });

    session.on('progress', () => {
      this.onLog?.('📞 Call ringing...');
      this.state = 'ringing';
      this.onState('ringing');
    });
  }

  // Sanitize phone number: remove spaces and add + prefix
  private sanitizePhoneNumber(phone: string): string {
    // Keep special numbers like *225 unchanged
    if (phone.startsWith('*')) {
      return phone;
    }
    
    // Remove all spaces
    const cleaned = phone.replace(/\s+/g, '');
    
    // Add + prefix if not already present
    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  }

  async call(phoneNumber: string) {
    try {
      if (!this.ua || !this.isRegistered) {
        throw new Error('SIP client not registered. Please wait for registration to complete.');
      }

      if (this.session) {
        throw new Error('Another call is already in progress');
      }

      // Sanitize the phone number
      const sanitizedNumber = this.sanitizePhoneNumber(phoneNumber);
      const destination = phoneNumber === '*225' ? '*225' : sanitizedNumber;
      const sipUri = `sip:${destination}@asterisk11.mooo.com:8089`;
      
      this.onLog?.(`📞 Phone number sanitized: ${phoneNumber} → ${sanitizedNumber}`);
      
      this.onLog?.(`📞 Initiating SIP call to ${destination}...`);
      this.onLog?.(`🔗 SIP URI: ${sipUri}`);
      
      this.state = 'connecting';
      this.onState('connecting');

      const options = {
        mediaConstraints: { audio: true, video: false },
        rtcOfferConstraints: {
          offerToReceiveAudio: true,
          offerToReceiveVideo: false
        }
      };

      // Make the SIP call
      this.session = this.ua.call(sipUri, options);
      this.onLog?.('📤 SIP call initiated via JsSIP');
      
      this.setupCallEvents(this.session);
      this.setupRemoteAudio(this.session);

    } catch (error: any) {
      this.onLog?.(`❌ SIP call failed: ${error.message}`);
      this.state = 'ended';
      this.onState('ended');
      this.cleanupCall();
      throw error;
    }
  }

  // Send DTMF tones during call
  sendDTMF(digit: string) {
    if (this.session && this.state === 'connected') {
      try {
        this.session.sendDTMF(digit);
        this.onLog?.(`🎹 Sent DTMF: ${digit}`);
      } catch (error) {
        this.onLog?.(`❌ Failed to send DTMF: ${error}`);
      }
    }
  }

  // Hold/unhold functionality
  async hold(hold: boolean) {
    if (this.session && this.state === 'connected') {
      try {
        if (hold) {
          this.session.hold();
          this.isHeld = true;
          this.onLog?.('⏸️ Call on hold');
        } else {
          this.session.unhold();
          this.isHeld = false;
          this.onLog?.('▶️ Call resumed');
        }
      } catch (error) {
        this.onLog?.(`❌ Failed to ${hold ? 'hold' : 'unhold'} call: ${error}`);
      }
    }
  }

  // Get call duration in seconds
  getCallDuration(): number {
    if (!this.callStartTime || this.state !== 'connected') return 0;
    return Math.floor((Date.now() - this.callStartTime.getTime()) / 1000);
  }

  // Get call statistics
  async getCallStats() {
    if (!this.session || !this.session.connection) return null;
    
    try {
      const stats = await this.session.connection.getStats();
      const audioStats: any = {};
      
      stats.forEach((report: any) => {
        if (report.type === 'inbound-rtp' && report.mediaType === 'audio') {
          audioStats.packetsReceived = report.packetsReceived;
          audioStats.packetsLost = report.packetsLost;
          audioStats.jitter = report.jitter;
        }
        if (report.type === 'outbound-rtp' && report.mediaType === 'audio') {
          audioStats.packetsSent = report.packetsSent;
          audioStats.bytesSent = report.bytesSent;
        }
      });
      
      return audioStats;
    } catch (error) {
      this.onLog?.(`❌ Failed to get call stats: ${error}`);
      return null;
    }
  }

  hangup() {
    this.onLog?.('📞 Hanging up SIP call');
    
    const duration = this.getCallDuration();
    if (duration > 0) {
      this.onLog?.(`⏱️ Call duration: ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`);
    }
    
    if (this.session) {
      try {
        this.session.terminate();
      } catch (error) {
        this.onLog?.(`⚠️ Error during hangup: ${error}`);
      }
    }
    
    this.cleanupCall();
    this.state = 'ended';
    this.onState('ended');
  }

  mute(muted: boolean) {
    if (this.session && this.state === 'connected') {
      try {
        if (muted) {
          this.session.mute();
        } else {
          this.session.unmute();
        }
        this.isMuted = muted;
        this.onLog?.(muted ? '🔇 Microphone muted' : '🔊 Microphone unmuted');
      } catch (error) {
        this.onLog?.(`❌ Failed to ${muted ? 'mute' : 'unmute'}: ${error}`);
      }
    }
  }

  isMutedState(): boolean {
    return this.isMuted;
  }

  isHeldState(): boolean {
    return this.isHeld;
  }

  private cleanupCall() {
    this.session = null;
    this.callStartTime = null;
    this.isMuted = false;
    this.isHeld = false;
    
    if (this.remoteAudio) {
      this.remoteAudio.srcObject = null;
    }
  }

  // Cleanup when destroying the client
  destroy() {
    if (this.ua) {
      this.ua.stop();
      this.ua = null;
    }
    
    this.cleanupCall();
    
    if (this.remoteAudio && this.remoteAudio.parentNode) {
      this.remoteAudio.parentNode.removeChild(this.remoteAudio);
      this.remoteAudio = null;
    }
    
    this.isRegistered = false;
  }
}

interface LeadItem {
  id: string;
  name: string;
  first_name: string;
  phone: string;
  status: string;
}

interface ActiveCall {
  id: string; // lead id
  lead: LeadItem;
  client: SipClient;
  state: 'idle'|'connecting'|'ringing'|'connected'|'ended'|'queued';
  startedAt: number;
  connectedAt?: number;
  muted: boolean;
}

const AutoSpeedDialer: React.FC<AutoSpeedDialerProps> = ({ open, onOpenChange, commercial, initialConcurrency = 3, onLeadConnected }) => {
  console.log('🎯 AutoSpeedDialer rendered', { open, commercial: commercial?.id, initialConcurrency });
  
  const [concurrency, setConcurrency] = useState(Math.min(5, Math.max(3, initialConcurrency)));
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [queue, setQueue] = useState<LeadItem[]>([]);
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [running, setRunning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [commercials, setCommercials] = useState<any[]>([]);
  const [targetCommercialId, setTargetCommercialId] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedLeadForScript, setSelectedLeadForScript] = useState<LeadItem | null>(null);
  const [showScriptLightbox, setShowScriptLightbox] = useState(false);
  
  const addLog = useCallback((msg: string) => {
    console.log('📝 Log:', msg);
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`${timestamp} • ${msg}`, ...prev].slice(0, 200));
  }, []);

  const connectedCount = useMemo(() => activeCalls.filter(c => c.state === 'connected').length, [activeCalls]);

  const fetchLeads = useCallback(async () => {
    if (!commercial?.id) {
      console.log('❌ No commercial ID provided');
      addLog('❌ No commercial ID provided');
      return;
    }
    console.log('📋 Professional Speed Dialer: Fetching leads for:', commercial.name);
    setRefreshing(true);
    const { data, error } = await supabase
      .from('marketing_contacts')
      .select('id, name, first_name, phone, status')
      .eq('commercial_id', commercial.id)
      .in('status', ['new', 'callback', 'not_answering_1', 'not_answering_2', 'interested']); // All callable statuses
    setRefreshing(false);
    if (error) { 
      console.error('❌ Speed Dialer: Error fetching leads:', error);
      addLog(`❌ Error fetching leads: ${error.message || error}`); 
      return; 
    }
    
    // Professional speed dialer: Randomize all leads and take up to 50 for the session
    const shuffledLeads = [...(data || [])].sort(() => Math.random() - 0.5);
    const dialingQueue = shuffledLeads.slice(0, 50);
    
    console.log('✅ Speed Dialer: Total callable leads:', data?.length || 0);
    console.log('🎲 Speed Dialer: Randomized queue of', dialingQueue.length, 'leads prepared');
    console.log('🎯 Speed Dialer: First 5 leads:', dialingQueue.slice(0, 5).map(l => ({ name: `${l.first_name} ${l.name}`, phone: l.phone, status: l.status })));
    
    setLeads(dialingQueue as any);
    setQueue(dialingQueue as any);
    addLog(`🎲 Professional Speed Dialer loaded: ${dialingQueue.length} leads randomized from ${data?.length || 0} total callable contacts.`);
  }, [commercial?.id, commercial?.name, addLog]);

  useEffect(() => {
    console.log('🔄 AutoSpeedDialer useEffect triggered', { open, commercial: commercial?.id });
    if (open) {
      addLog('🎬 Speed Dial opened - initializing...');
      fetchLeads();
      supabase
        .from('commercials')
        .select('id, name')
        .order('name')
        .then(({ data }) => {
          setCommercials((data || []).filter((c: any) => c.id !== commercial.id));
        });
    } else {
      // cleanup when closing
      console.log('🔄 Speed Dial closing - cleaning up');
      activeCalls.forEach(c => c.client.hangup());
      setActiveCalls([]);
      setRunning(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const startNextIfPossible = useCallback(async () => {
    if (!running || isPaused) return; // Stop if paused
    const activeCount = activeCalls.filter(c => c.state !== 'ended').length;
    // Modified logic: Allow more calls to continue even with connections
    const canLaunchMore = activeCount < concurrency && queue.length > 0;
    if (!canLaunchMore) return;
    const next = queue[0];
    if (!next) return;

    // dequeue
    setQueue(prev => prev.slice(1));

    const callId = next.id;
    addLog(`🚀 Initiating SIP call to ${next.first_name} ${next.name} (${next.phone})`);
    const client = new SipClient((state) => {
      setActiveCalls(prev => prev.map(c => c.id === callId ? {
        ...c,
        state,
        connectedAt: state === 'connected' ? Date.now() : c.connectedAt
      } : c));

      if (state === 'ended') {
        // If ended before connected -> mark as voicemail
        const call = activeCalls.find(c => c.id === callId);
        if (!call?.connectedAt) {
          supabase.from('marketing_contacts').update({ status: 'voicemail' }).eq('id', callId).then(() => {});
          addLog(`📞 ${next.first_name} went to voicemail`);
        } else {
          addLog(`✅ Call with ${next.first_name} completed (${Math.round((Date.now() - call.connectedAt) / 1000)}s)`);
        }
        
        // Clean up ended call and try next
        setTimeout(() => {
          setActiveCalls(prev => prev.filter(c => c.id !== callId));
          startNextIfPossible();
        }, 1000);
      }

      if (state === 'connected') {
        addLog(`🎉 Connected to ${next.first_name} ${next.name}!`);
        
        // Auto-pause when someone answers
        setIsPaused(true);
        addLog(`⏸️ Auto-paused dialing - ${next.first_name} answered`);
        
        // Check if another call is already active
        const others = activeCalls.filter(c => c.id !== callId && c.state === 'connected');
        if (others.length >= 1) {
          // Queue this call for later
          client.mute(true);
          setActiveCalls(prev => prev.map(c => c.id === callId ? { ...c, state: 'queued', muted: true } : c));
          addLog(`📋 ${next.first_name} queued - another call in progress`);
        }
      }
    }, addLog);

    try {
      setActiveCalls(prev => ([...prev, { id: callId, lead: next, client, state: 'connecting', startedAt: Date.now(), muted: false }]));
      await client.initialize();
      await client.call(next.phone);
    } catch (e) {
      addLog(`❌ Failed to call ${next.first_name}: ${e instanceof Error ? e.message : 'Unknown error'}`);
      setActiveCalls(prev => prev.map(c => c.id === callId ? { ...c, state: 'ended' } : c));
      setTimeout(() => {
        setActiveCalls(prev => prev.filter(c => c.id !== callId));
        startNextIfPossible();
      }, 1000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, concurrency, queue, activeCalls, connectedCount, commercial?.id]);

  useEffect(() => {
    if (!running) return;
    // Kick off until we fill concurrency - slower interval to prevent issues
    const tick = async () => {
      await startNextIfPossible();
    };
    const id = setInterval(tick, 2000); // Increased from 800ms to 2000ms
    return () => clearInterval(id);
  }, [running, startNextIfPossible]);

  const handleStart = async () => {
    console.log('🚀 SIP Speed Dial starting!', { leads: leads.length, commercial: commercial?.id });
    addLog('🎯 SIP Speed Dial starting...');
    if (!leads.length) await fetchLeads();
    addLog(`Starting SIP speed dial (concurrency: ${concurrency})`);
    setRunning(true);
  };

  const handleStop = () => {
    setRunning(false);
    activeCalls.forEach(c => c.client.hangup());
    setActiveCalls([]);
  };

  const acceptQueued = (id: string) => {
    const chosen = activeCalls.find(c => c.id === id);
    setActiveCalls(prev => prev.map(c => {
      if (c.id === id) {
        c.client.mute(false);
        return { ...c, state: 'connected', muted: false };
      }
      return c;
    }));
    // Mute others and stop dialer, open script for chosen
    activeCalls.forEach(c => { if (c.id !== id && c.state !== 'ended') c.client.hangup(); });
    setRunning(false);
    if (chosen) onLeadConnected?.(chosen.lead);
    onOpenChange(false);
  };

  const hangup = (id: string) => {
    const call = activeCalls.find(c => c.id === id);
    call?.client.hangup();
    setActiveCalls(prev => prev.map(c => c.id === id ? { ...c, state: 'ended' } : c));
  };

  const transferLead = async (lead: LeadItem) => {
    const targetId = targetCommercialId || commercials.find((c: any) => c.id !== commercial.id)?.id;
    if (!targetId) return;
    await supabase.from('marketing_contacts').update({ commercial_id: targetId }).eq('id', lead.id);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-gradient-to-br from-gray-900 to-gray-800 border border-yellow-500/20 text-white w-[95vw] sm:w-auto max-w-full sm:max-w-6xl p-4 sm:p-6 rounded-xl shadow-2xl animate-scale-in">
          <DialogHeader>
            <DialogTitle className="text-yellow-400 flex flex-col sm:flex-row sm:items-center gap-3 text-lg sm:text-xl">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-500/20 p-2 rounded-lg">
                  <Users className="h-6 w-6" />
                </div>
                🎯 Professional Speed Dialer
              </div>
              <div className="text-sm bg-green-500/20 px-3 py-1 rounded-full border border-green-500/30 self-start sm:ml-auto">
                {leads.length} queued • {activeCalls.filter(c => c.state === 'ringing').length} calling • {connectedCount} connected
                {isPaused && <span className="ml-2 text-yellow-300">⏸️ PAUSED</span>}
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Select value={String(concurrency)} onValueChange={(v) => setConcurrency(Number(v))}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white w-full sm:w-32">
                  <SelectValue placeholder="Concurrency" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white z-50">
                  <SelectItem value="3">3 lignes</SelectItem>
                  <SelectItem value="4">4 lignes</SelectItem>
                  <SelectItem value="5">5 lignes</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={fetchLeads} variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800 w-full sm:w-auto" disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} /> Rafraîchir
              </Button>
              <Select value={targetCommercialId} onValueChange={setTargetCommercialId}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white w-full sm:w-56">
                  <SelectValue placeholder="Transférer vers..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white z-50">
                  {commercials.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              {!running ? (
                <Button 
                  onClick={handleStart} 
                  className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold w-full sm:w-auto shadow-lg"
                >
                  <Play className="h-4 w-4 mr-2" /> 🚀 Start Dialer
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={() => setIsPaused(!isPaused)} 
                    variant="outline" 
                    className={`border-gray-600 ${isPaused ? 'text-green-400 hover:text-green-300' : 'text-yellow-400 hover:text-yellow-300'} hover:bg-gray-700 w-full sm:w-auto shadow-lg`}
                  >
                    {isPaused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />} 
                    {isPaused ? '▶️ Resume' : '⏸️ Pause'}
                  </Button>
                  <Button onClick={handleStop} variant="destructive" className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 w-full sm:w-auto shadow-lg">
                    <Square className="h-4 w-4 mr-2" /> ⏹️ Stop All
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 border border-gray-600/50 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  📊 Live Activity Feed
                  {running && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>}
                  {isPaused && <span className="text-yellow-400 text-xs">⏸️ PAUSED</span>}
                </span>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-gray-400 hover:text-white" onClick={() => setLogs([])}>
                  Clear
                </Button>
              </div>
              <div className="max-h-48 overflow-auto bg-black/20 rounded-md p-3 border border-gray-700/30">
                {logs.length === 0 ? (
                  <div className="text-sm text-gray-500 text-center py-4">
                    🎯 Ready for professional dialing! Click "Start Dialer" to begin...
                  </div>
                ) : (
                  <ul className="space-y-1 text-xs font-mono">
                    {logs.map((l, i) => (
                      <li key={i} className={`${
                        l.includes('🎉') || l.includes('✅') ? 'text-green-400' :
                        l.includes('❌') || l.includes('💥') ? 'text-red-400' :
                        l.includes('📞') ? 'text-blue-400' :
                        l.includes('🚀') ? 'text-yellow-400' :
                        l.includes('⏸️') ? 'text-yellow-400' :
                        'text-gray-400'
                      }`}>{l}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6 max-h-[60vh] overflow-auto">
            {activeCalls.map((c) => (
              <Card key={c.id} className="bg-gradient-to-br from-gray-800/80 to-gray-700/80 border border-gray-600/50 shadow-lg animate-fade-in backdrop-blur-sm">
                <CardContent className="p-4 space-y-3">
                   <div className="flex items-center justify-between gap-3">
                     <div className="min-w-0">
                       <div className="text-sm font-medium text-white truncate flex items-center gap-2">
                         {c.state === 'connected' && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>}
                         {c.lead.first_name} {c.lead.name}
                         {c.client.isHeldState() && <span className="text-xs text-yellow-400">⏸️ On Hold</span>}
                       </div>
                       <div className="text-xs text-gray-400 truncate">{c.lead.phone}</div>
                       {c.state === 'connected' && (
                         <div className="text-xs text-green-400">
                           Duration: {Math.floor(c.client.getCallDuration() / 60)}:{(c.client.getCallDuration() % 60).toString().padStart(2, '0')}
                         </div>
                       )}
                     </div>
                    <div className={`text-xs font-semibold capitalize flex-shrink-0 px-2 py-1 rounded-full ${
                      c.state === 'connected' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                      c.state === 'ringing' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                      c.state === 'queued' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                      'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                    }`}>
                      {c.state === 'connected' ? '🟢 Connected' :
                       c.state === 'ringing' ? '🟡 Ringing' :
                       c.state === 'queued' ? '🔵 Queued' :
                       c.state}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {(c.state === 'queued') && (
                      <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-black" onClick={() => acceptQueued(c.id)}>
                        <ArrowRight className="h-4 w-4 mr-1" /> Prendre l'appel
                      </Button>
                    )}
                    {(c.state === 'connected' || c.state === 'queued' || c.state === 'ringing' || c.state === 'connecting') && (
                      <Button size="sm" variant="secondary" className="bg-gray-700 hover:bg-gray-600" onClick={() => hangup(c.id)}>
                        <PhoneOff className="h-4 w-4 mr-1" /> Raccrocher
                      </Button>
                    )}
                     {c.state === 'connected' && (
                       <>
                         <Button 
                           size="sm" 
                           variant="outline" 
                           className="border-blue-600 text-blue-400 hover:bg-blue-600/20 hover:text-blue-300" 
                           onClick={() => {
                             setSelectedLeadForScript(c.lead);
                             setShowScriptLightbox(true);
                           }}
                         >
                           <FileText className="h-4 w-4 mr-1" /> Script
                         </Button>
                         <Button size="sm" variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700" onClick={() => transferLead(c.lead)}>
                           <Share2 className="h-4 w-4 mr-1" /> Transférer
                         </Button>
                       </>
                     )}
                     {(c.state === 'connected' || c.state === 'queued') && (
                       <>
                         <Button size="sm" variant="ghost" className="text-gray-300 hover:text-white" onClick={() => { c.client.mute(!c.muted); setActiveCalls(prev => prev.map(x => x.id === c.id ? { ...x, muted: !x.muted } : x)); }}>
                           <VolumeX className="h-4 w-4 mr-1" /> {c.muted ? 'Unmute' : 'Mute'}
                         </Button>
                         <Button size="sm" variant="ghost" className="text-gray-300 hover:text-white" onClick={() => c.client.hold(!c.client.isHeldState())}>
                           ⏸️ {c.client.isHeldState() ? 'Resume' : 'Hold'}
                         </Button>
                       </>
                     )}
                     {/* DTMF Dialpad for connected calls */}
                     {c.state === 'connected' && (
                       <div className="w-full mt-2">
                         <details className="text-xs">
                           <summary className="cursor-pointer text-gray-400 hover:text-white">DTMF Dialpad</summary>
                           <div className="grid grid-cols-3 gap-1 mt-2">
                             {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(digit => (
                               <Button 
                                 key={digit} 
                                 size="sm" 
                                 variant="outline" 
                                 className="h-8 text-xs border-gray-600"
                                 onClick={() => c.client.sendDTMF(digit)}
                               >
                                 {digit}
                               </Button>
                             ))}
                           </div>
                         </details>
                       </div>
                     )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {!activeCalls.length && (
              <div className="flex items-center justify-center text-gray-400 h-32 border border-dashed border-gray-700 rounded-md">
                {loading ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Préparation...</span>
                ) : (
                  <span>Aucun appel actif. Cliquez sur Démarrer.</span>
                )}
              </div>
            )}
          </div>

           <div className="text-xs text-gray-500 mt-3">
             ✅ Smart Speed Dialer with: Auto-pause on answer • Script lightbox • Pause/Resume control • Real SIP integration • Multi-line concurrency • Call management
           </div>
        </DialogContent>
      </Dialog>

      {/* Script Lightbox - Doesn't interrupt the call */}
      {showScriptLightbox && selectedLeadForScript && (
        <Dialog open={showScriptLightbox} onOpenChange={setShowScriptLightbox}>
          <DialogContent className="bg-gradient-to-br from-gray-900 to-gray-800 border border-blue-500/20 text-white w-[95vw] sm:w-auto max-w-full sm:max-w-4xl p-4 sm:p-6 rounded-xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-blue-400 flex items-center gap-3 text-lg sm:text-xl">
                <FileText className="h-6 w-6" />
                Script - {selectedLeadForScript.first_name} {selectedLeadForScript.name}
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-auto">
              <CallScript
                lead={selectedLeadForScript}
                commercial={commercial}
                onBack={() => setShowScriptLightbox(false)}
                onLogout={() => {}}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default AutoSpeedDialer;
