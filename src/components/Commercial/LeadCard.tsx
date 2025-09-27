import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, User, Edit2, Check, X, Mail, UserPlus, Send, PhoneOff, Mic, MicOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
// @ts-ignore - JsSIP types not available
import * as JsSIP from 'jssip';

interface Lead {
  id: string;
  name: string;
  first_name: string;
  email: string;
  phone: string;
  status: string;
  commercial_id: string | null;
  source?: string;
}

interface LeadCardProps {
  lead: Lead;
  commercial: any;
  isUnassigned?: boolean;
  onUpdate: () => void;
}

const LeadCard = ({ lead, commercial, isUnassigned = false, onUpdate }: LeadCardProps) => {
  const { toast } = useToast();
  const [editingEmail, setEditingEmail] = useState(false);
  const [editEmailValue, setEditEmailValue] = useState(lead.email);
  const [selectedEmailTemplate, setSelectedEmailTemplate] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [callState, setCallState] = useState<string>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const sipClientRef = useRef<any>(null);
  
  // Fetch email templates
  const { data: emailTemplates } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // SIP Client using JsSIP (same as CallScript)
  class RealSIPClient {
    private ua: any = null;
    private session: any = null;
    private remoteAudio: HTMLAudioElement | null = null;

    constructor(private onStateChange?: (state: string) => void) {
      this.remoteAudio = new Audio();
      this.remoteAudio.autoplay = true;
      this.remoteAudio.style.display = 'none';
      document.body.appendChild(this.remoteAudio);
    }

    async connect() {
      try {
        this.onStateChange?.('connecting');

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

        this.ua = new JsSIP.UA(configuration);

        return await new Promise<boolean>((resolve, reject) => {
          this.ua.on('registered', () => {
            this.onStateChange?.('registered');
            resolve(true);
          });

          this.ua.on('registrationFailed', (e: any) => {
            console.error('❌ SIP registration failed:', e?.cause);
            this.onStateChange?.('failed');
            reject(new Error('SIP registration failed'));
          });

          this.ua.on('newRTCSession', (data: any) => {
            const session = data.session;
            if (data.originator === 'remote') {
              session.answer({ mediaConstraints: { audio: true, video: false } });
              this.session = session;
              this.setupCallEvents(session);
              this.setupRemoteAudio(session);
            }
          });

          this.ua.start();
        });
      } catch (error) {
        console.error('Error initializing SIP client:', error);
        this.onStateChange?.('failed');
        throw error;
      }
    }

    private setupRemoteAudio(session: any) {
      session.connection.addEventListener('track', (event: any) => {
        if (event.track.kind === 'audio' && event.streams && event.streams[0]) {
          if (this.remoteAudio) {
            this.remoteAudio.srcObject = event.streams[0];
            this.remoteAudio.play().catch(() => {});
          }
        }
      });
    }

    private setupCallEvents(session: any) {
      session.on('progress', () => {
        this.onStateChange?.('ringing');
      });
      session.on('confirmed', () => {
        this.onStateChange?.('connected');
      });
      session.on('ended', () => {
        this.onStateChange?.('ended');
        this.session = null;
        if (this.remoteAudio) this.remoteAudio.srcObject = null;
      });
      session.on('failed', (e: any) => {
        console.error('Call failed:', e?.cause);
        this.onStateChange?.('failed');
        this.session = null;
        if (this.remoteAudio) this.remoteAudio.srcObject = null;
      });
    }

    private sanitizePhoneNumber(phone: string): string {
      if (!phone) return phone;
      if (phone.startsWith('*')) return phone;
      const cleaned = phone.replace(/\s+/g, '');
      return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
    }

    async call(phoneNumber: string) {
      if (!this.ua) throw new Error('SIP not connected');

      const destination = this.sanitizePhoneNumber(phoneNumber);
      const sipUri = `sip:${destination}@asterisk11.mooo.com:8089`;

      this.onStateChange?.('connecting');

      const options = {
        mediaConstraints: { audio: true, video: false },
        rtcOfferConstraints: {
          offerToReceiveAudio: true,
          offerToReceiveVideo: false
        }
      };

      this.session = this.ua.call(sipUri, options);
      this.setupCallEvents(this.session);
      this.setupRemoteAudio(this.session);
    }

    mute(muted: boolean) {
      if (this.session) {
        if (muted) this.session.mute();
        else this.session.unmute();
      }
    }

    hangup() {
      try {
        if (this.session) {
          this.session.terminate();
          this.session = null;
        }
        this.onStateChange?.('ended');
      } catch (error) {
        console.error('Hangup error:', error);
        this.onStateChange?.('ended');
      }
    }

    disconnect() {
      try { if (this.session) this.session.terminate(); } catch {}
      try { if (this.ua) this.ua.stop(); } catch {}
      if (this.remoteAudio && this.remoteAudio.parentNode) {
        this.remoteAudio.parentNode.removeChild(this.remoteAudio);
      }
      this.onStateChange?.('ended');
    }
  }

  useEffect(() => {
    return () => {
      if (sipClientRef.current) {
        sipClientRef.current.disconnect();
      }
    };
  }, []);

  const updateLeadStatus = async (newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      
      // If this is an unassigned lead, assign it to the current commercial
      if (isUnassigned) {
        updateData.commercial_id = commercial.id;
      }

      const { error } = await supabase
        .from('marketing_contacts')
        .update(updateData)
        .eq('id', lead.id);

      if (error) throw error;

      toast({
        title: "Status mis à jour",
        description: isUnassigned 
          ? `Lead assigné et marqué comme "${newStatus}"`
          : `Lead marqué comme "${newStatus}"`
      });

      onUpdate();
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le status",
        variant: "destructive"
      });
    }
  };

  const updateLeadEmail = async (newEmail: string) => {
    try {
      const updateData: any = { email: newEmail };
      
      // If this is an unassigned lead, assign it to the current commercial
      if (isUnassigned) {
        updateData.commercial_id = commercial.id;
      }

      const { error } = await supabase
        .from('marketing_contacts')
        .update(updateData)
        .eq('id', lead.id);

      if (error) throw error;

      toast({
        title: "Email mis à jour",
        description: isUnassigned 
          ? `Lead assigné et email mis à jour vers "${newEmail}"`
          : `Email du lead mis à jour vers "${newEmail}"`
      });

      onUpdate();
      setEditingEmail(false);
      setEditEmailValue(newEmail);
    } catch (error) {
      console.error('Error updating lead email:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'email",
        variant: "destructive"
      });
    }
  };

  const assignLeadToMe = async () => {
    try {
      const { error } = await supabase
        .from('marketing_contacts')
        .update({ commercial_id: commercial.id })
        .eq('id', lead.id);

      if (error) throw error;

      toast({
        title: "Lead assigné",
        description: "Le lead vous a été assigné"
      });

      onUpdate();
    } catch (error) {
      console.error('Error assigning lead:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'assigner le lead",
        variant: "destructive"
      });
    }
  };

  const handleEmailEdit = () => {
    setEditingEmail(true);
    setEditEmailValue(lead.email);
  };

  const handleEmailCancel = () => {
    setEditingEmail(false);
    setEditEmailValue(lead.email);
  };

  const handleEmailSave = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = editEmailValue.trim();
    
    if (!trimmedEmail) {
      toast({
        title: "Erreur",
        description: "L'email ne peut pas être vide",
        variant: "destructive"
      });
      return;
    }
    
    if (!emailRegex.test(trimmedEmail)) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer une adresse email valide",
        variant: "destructive"
      });
      return;
    }
    
    updateLeadEmail(trimmedEmail);
  };

  const handleEmailTemplateSend = async () => {
    if (!selectedEmailTemplate) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un template",
        variant: "destructive"
      });
      return;
    }

    try {
      setSendingEmail(true);
      const template = emailTemplates?.find(t => t.id === selectedEmailTemplate);
      if (!template) {
        toast({
          title: "Erreur",
          description: "Template non trouvé",
          variant: "destructive"
        });
        return;
      }

      // Send email using the marketing email function with correct parameters
      const { data, error } = await supabase.functions.invoke('send-marketing-email', {
        body: {
          to: lead.email,
          name: lead.name,
          first_name: lead.first_name,
          template_id: selectedEmailTemplate,
          commercial_id: commercial.id,
          contact_id: lead.id,
          domain: commercial.email_domain_preference || 'domain1'
        }
      });

      if (error) throw error;
      
      if (!data.success) {
        throw new Error(data.error || data.details || 'Failed to send email');
      }

      toast({
        title: "Email envoyé",
        description: `Email "${template.subject}" envoyé à ${lead.first_name} ${lead.name}`
      });

      // Update lead status to indicate contact was made
      if (lead.status === 'new') {
        updateLeadStatus('callback');
      }

      setSelectedEmailTemplate('');
      onUpdate();
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer l'email",
        variant: "destructive"
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleWebRTCCall = async () => {
    if (callState === 'connected' || callState === 'ringing') {
      // Hang up if already calling or connected
      sipClientRef.current?.hangup();
      sipClientRef.current = null;
      return;
    }

    try {
      const handleStateChange = (state: string) => {
        setCallState(state);
        
        if (state === 'connected') {
          toast({
            title: "Appel connecté",
            description: `En ligne avec ${lead.first_name} ${lead.name}`
          });
        } else if (state === 'failed') {
          toast({
            title: "Échec de l'appel",
            description: "Impossible de joindre le numéro",
            variant: "destructive"
          });
        } else if (state === 'ended') {
          toast({
            title: "Appel terminé",
            description: `Appel avec ${lead.first_name} ${lead.name} terminé`
          });
        }
      };

      sipClientRef.current = new RealSIPClient(handleStateChange);
      await sipClientRef.current.connect();
      await sipClientRef.current.call(lead.phone);
      
    } catch (error) {
      console.error('WebRTC call failed:', error);
      toast({
        title: "Erreur d'appel",
        description: error instanceof Error ? error.message : 'Échec de la connexion',
        variant: "destructive"
      });
      setCallState('failed');
    }
  };

  const toggleMute = () => {
    if (sipClientRef.current) {
      const newMutedState = !isMuted;
      sipClientRef.current.mute(newMutedState);
      setIsMuted(newMutedState);
      toast({
        title: newMutedState ? "Micro coupé" : "Micro activé",
        description: newMutedState ? "Votre micro est maintenant coupé" : "Votre micro est maintenant activé"
      });
    }
  };

  const getCallButtonText = () => {
    switch (callState) {
      case 'connecting': return 'Connexion...';
      case 'ringing': return 'Sonnerie...';
      case 'connected': return 'Raccrocher';
      case 'failed': return 'Réessayer';
      case 'ended': return 'Appel';
      default: return 'Appel';
    }
  };

  const getCallButtonClass = () => {
    switch (callState) {
      case 'connecting': return 'bg-yellow-600 hover:bg-yellow-700';
      case 'ringing': return 'bg-blue-600 hover:bg-blue-700';
      case 'connected': return 'bg-red-600 hover:bg-red-700';
      case 'failed': return 'bg-orange-600 hover:bg-orange-700';
      default: return 'bg-green-600 hover:bg-green-700';
    }
  };

  const getCallButtonIcon = () => {
    if (callState === 'connected' || callState === 'ringing') {
      return <PhoneOff className="h-4 w-4 mr-1" />;
    }
    return <Phone className="h-4 w-4 mr-1" />;
  };

  return (
    <Card className={`bg-gray-800 border-gray-700 ${isUnassigned ? 'border-l-4 border-l-blue-500' : ''}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <User className="h-4 w-4" />
          {lead.first_name} {lead.name}
          {isUnassigned && (
            <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">NON ASSIGNÉ</span>
          )}
        </CardTitle>
        <CardDescription className="text-gray-400">
          Status: {lead.status}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-gray-300">
          <Mail className="h-4 w-4" />
          {editingEmail ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={editEmailValue}
                onChange={(e) => setEditEmailValue(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white text-sm h-8 flex-1"
                placeholder="Entrez l'email"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleEmailSave();
                  }
                  if (e.key === 'Escape') {
                    handleEmailCancel();
                  }
                }}
              />
              <Button
                size="sm"
                onClick={handleEmailSave}
                className="bg-green-600 hover:bg-green-700 p-1 h-8 w-8"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleEmailCancel}
                className="border-gray-600 text-gray-300 hover:bg-gray-800 p-1 h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm flex-1">{lead.email}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleEmailEdit}
                className="text-gray-400 hover:text-white hover:bg-gray-700 p-1 h-6 w-6"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-gray-300">
          <Phone className="h-4 w-4" />
          <span className="text-sm">{lead.phone}</span>
        </div>
        
        {lead.source && (
          <div className="flex items-center gap-2 text-gray-300">
            <span className="text-xs bg-gray-700 px-2 py-1 rounded">Source: {lead.source}</span>
          </div>
        )}
        
        {/* Status Selector */}
        <div className="space-y-2">
          <label className="text-xs text-gray-400">Status:</label>
          <Select value={lead.status} onValueChange={updateLeadStatus}>
            <SelectTrigger className="bg-gray-700 border-gray-600 text-white h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 border-gray-600">
              <SelectItem value="new" className="text-white">New</SelectItem>
              <SelectItem value="not_answering_1" className="text-white">Not Answering (1x)</SelectItem>
              <SelectItem value="not_answering_2" className="text-white">Not Answering (2x)</SelectItem>
              <SelectItem value="not_answering_3" className="text-white">Not Answering (3x+)</SelectItem>
              <SelectItem value="callback" className="text-white">To Call Back</SelectItem>
              <SelectItem value="wrong_number" className="text-white">Wrong Number</SelectItem>
              <SelectItem value="interested" className="text-white">Interested</SelectItem>
              <SelectItem value="not_interested" className="text-white">Not Interested</SelectItem>
              <SelectItem value="converted" className="text-white">Converted</SelectItem>
              <SelectItem value="do_not_call" className="text-white">Do Not Call</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          {isUnassigned && (
            <Button
              size="sm"
              onClick={assignLeadToMe}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <UserPlus className="h-4 w-4 mr-1" />
              M'assigner ce Lead
            </Button>
          )}
          
          {/* Email Template Sender */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400">Envoyer Email:</label>
            <div className="flex gap-2">
              <Select value={selectedEmailTemplate} onValueChange={setSelectedEmailTemplate}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white h-8 flex-1">
                  <SelectValue placeholder="Choisir template..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600 max-h-60">
                  {emailTemplates?.map((template) => (
                    <SelectItem key={template.id} value={template.id} className="text-white">
                      {template.name} - {template.subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={handleEmailTemplateSend}
                disabled={!selectedEmailTemplate || sendingEmail}
                className="bg-purple-600 hover:bg-purple-700 px-3 h-8"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* WebRTC Call Button */}
          <div className="flex gap-2">
            <Button
              size="sm"
              className={`flex-1 ${getCallButtonClass()}`}
              onClick={handleWebRTCCall}
              disabled={callState === 'connecting'}
            >
              {getCallButtonIcon()}
              {getCallButtonText()}
            </Button>
            
            {/* Mute button - only show when connected */}
            {callState === 'connected' && (
              <Button
                size="sm"
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700 px-3"
                onClick={toggleMute}
              >
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeadCard;