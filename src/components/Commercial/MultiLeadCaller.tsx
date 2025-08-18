import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, PhoneOff, User, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import SimpleSipDialer from './SimpleSipDialer';

interface MultiLeadCallerProps {
  commercial: any;
  currentLead: any;
  onLeadAnswered: (lead: any) => void;
  onClose: () => void;
}

interface CallState {
  lead: any;
  status: 'idle' | 'calling' | 'ringing' | 'connected' | 'failed' | 'no_answer';
  startTime?: Date;
  duration?: number;
}

const MultiLeadCaller: React.FC<MultiLeadCallerProps> = ({
  commercial,
  currentLead,
  onLeadAnswered,
  onClose
}) => {
  const { toast } = useToast();
  const [calls, setCalls] = useState<CallState[]>([]);
  const [isActive, setIsActive] = useState(false);

  // Fetch next leads to call
  const { data: leads } = useQuery({
    queryKey: ['next-leads', commercial.id, currentLead.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_contacts')
        .select('*')
        .eq('commercial_id', commercial.id)
        .neq('id', currentLead.id)
        .not('status', 'in', '(converted,closed,do_not_call)')
        .order('created_at', { ascending: false })
        .limit(2);
      
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (leads && leads.length > 0) {
      setCalls(leads.map(lead => ({
        lead,
        status: 'idle'
      })));
    }
  }, [leads]);

  const handleCallStateChange = (leadId: string, newState: string) => {
    setCalls(prev => prev.map(call => 
      call.lead.id === leadId 
        ? { 
            ...call, 
            status: newState as CallState['status'],
            startTime: newState === 'calling' ? new Date() : call.startTime
          }
        : call
    ));

    // If someone answers, select that lead
    if (newState === 'connected') {
      const answeredLead = calls.find(call => call.lead.id === leadId)?.lead;
      if (answeredLead) {
        // End all other calls
        setCalls(prev => prev.map(call => 
          call.lead.id !== leadId 
            ? { ...call, status: 'failed' }
            : call
        ));
        
        toast({
          title: "Appel connecté",
          description: `${answeredLead.first_name} ${answeredLead.name} a décroché`
        });
        
        setTimeout(() => {
          onLeadAnswered(answeredLead);
        }, 1000);
      }
    }
  };

  const startCalling = () => {
    setIsActive(true);
    toast({
      title: "Appels en cours",
      description: `Appel des ${calls.length} prochains prospects...`
    });
  };

  const stopCalling = () => {
    setIsActive(false);
    setCalls(prev => prev.map(call => ({ ...call, status: 'idle' })));
    onClose();
  };

  const getStatusIcon = (status: CallState['status']) => {
    switch (status) {
      case 'calling':
      case 'ringing':
        return <Clock className="h-4 w-4 text-yellow-400 animate-pulse" />;
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'failed':
      case 'no_answer':
        return <XCircle className="h-4 w-4 text-red-400" />;
      default:
        return <Phone className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: CallState['status']) => {
    switch (status) {
      case 'calling': return 'Numérotation...';
      case 'ringing': return 'Sonnerie...';
      case 'connected': return 'Connecté ✓';
      case 'failed': return 'Échec';
      case 'no_answer': return 'Pas de réponse';
      default: return 'En attente';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="bg-gray-800 border-gray-700 text-white w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-yellow-400" />
              <span>Speed Dial - Appel Multiple</span>
            </div>
            <Button
              onClick={stopCalling}
              variant="outline"
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <PhoneOff className="h-4 w-4 mr-2" />
              Arrêter
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {calls.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">Aucun prospect disponible pour l'appel multiple</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-4">
                {!isActive ? (
                  <Button
                    onClick={startCalling}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Commencer les appels simultanés
                  </Button>
                ) : (
                  <p className="text-yellow-400 font-medium">
                    Appels en cours... Le premier qui décroche sera sélectionné
                  </p>
                )}
              </div>

              <div className="grid gap-4">
                {calls.map((call, index) => (
                  <Card key={call.lead.id} className="bg-gray-700 border-gray-600">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <User className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="font-medium">
                              {call.lead.first_name} {call.lead.name}
                            </p>
                            <p className="text-sm text-gray-400">{call.lead.phone}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(call.status)}
                            <span className="text-sm">{getStatusText(call.status)}</span>
                          </div>
                          
                          {/* Hidden SIP dialer that gets activated when speed dial starts */}
                          <div className="opacity-0 pointer-events-none w-0 h-0 overflow-hidden">
                            {isActive && (
                              <SimpleSipDialer
                                phoneNumber={call.lead.phone}
                                commercial={commercial}
                                autoCall={true}
                                onCallStateChange={(state) => handleCallStateChange(call.lead.id, state)}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {call.status === 'connected' && (
                        <div className="mt-3 p-3 bg-green-600/20 border border-green-600/30 rounded">
                          <p className="text-green-400 text-sm font-medium">
                            🎉 Ce prospect a décroché ! Basculement automatique...
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MultiLeadCaller;