
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Phone, User, LogOut } from 'lucide-react';
import { useTranslation } from '@/utils/translations';
import { useToast } from '@/components/ui/use-toast';
import CallScript from './CallScript';
import AutoSpeedDialer from './AutoSpeedDialer';

interface SpeedDialProps {
  commercial: any;
  onBack: () => void;
  onLogout: () => void;
  sipConfig?: any;
}

const SpeedDial = ({ commercial, onBack, onLogout, sipConfig }: SpeedDialProps) => {
  console.log('🎯 SpeedDial component rendered', { commercial: commercial?.id, name: commercial?.name });
  const { t } = useTranslation(commercial.language || 'fr');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showSpeedDial, setShowSpeedDial] = useState(false);
  
  console.log('🎯 SpeedDial state:', { selectedLead: selectedLead?.id, showSpeedDial });
  
  const getNextLead = (currentLeadId: string, successful: boolean) => {
    if (!leads) return null;
    const currentIndex = leads.findIndex(lead => lead.id === currentLeadId);
    if (currentIndex === -1) return null;
    
    // Get next lead that's not converted or closed
    for (let i = currentIndex + 1; i < leads.length; i++) {
      const nextLead = leads[i];
      if (!['converted', 'closed'].includes(nextLead.status)) {
        return nextLead;
      }
    }
    
    // If no next lead found, loop back to beginning
    for (let i = 0; i < currentIndex; i++) {
      const nextLead = leads[i];
      if (!['converted', 'closed'].includes(nextLead.status)) {
        return nextLead;
      }
    }
    
    return null;
  };
  
  const handleNextLead = (successful: boolean) => {
    if (!selectedLead) return;
    
    const nextLead = getNextLead(selectedLead.id, successful);
    if (nextLead) {
      setSelectedLead(nextLead);
    } else {
      // No more leads, go back to list
      setSelectedLead(null);
    }
  };

  const { data: leads, isLoading, refetch } = useQuery({
    queryKey: ['commercial-leads', commercial.id],
    queryFn: async () => {
      console.log('🔍 SpeedDial: Fetching leads for commercial:', commercial.id, 'Name:', commercial.name);
      console.log('🔍 SpeedDial: Current URL:', window.location.href);
      console.log('🔍 SpeedDial: Commercial object:', commercial);
      
      try {
        // Fetch only "new" status leads for speed dial
        const { data, error } = await supabase
          .from('marketing_contacts')
          .select('*')
          .eq('commercial_id', commercial.id)
          .eq('status', 'new');
        
        if (error) {
          console.error('❌ SpeedDial: Error fetching leads:', error);
          throw error;
        }
        
        console.log('✅ SpeedDial: All leads fetched for', commercial.name, ':', data?.length, 'total leads');
        console.log('📊 SpeedDial: Lead statuses:', data?.reduce((acc, lead) => {
          acc[lead.status] = (acc[lead.status] || 0) + 1;
          return acc;
        }, {}));
        
        // Randomize the leads array and take first 8 for speed dialing
        const shuffledLeads = [...(data || [])].sort(() => Math.random() - 0.5);
        const speedDialLeads = shuffledLeads.slice(0, 8);
        
        console.log('🎲 SpeedDial: Randomized and limited to 8 leads:', speedDialLeads.length, 'selected for speed dial');
        console.log('🎯 SpeedDial: Selected leads:', speedDialLeads.map(l => ({ id: l.id, name: `${l.first_name} ${l.name}`, status: l.status })));
        
        return speedDialLeads;
      } catch (error) {
        console.error('❌ SpeedDial: Query failed:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les leads",
          variant: "destructive"
        });
        return [];
      }
    },
    staleTime: 0, // Always refetch to ensure fresh data and randomization
    gcTime: 0, // Don't cache to avoid stale data (new syntax for cacheTime)
  });

  const handleLeadStatusUpdate = async (leadId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('marketing_contacts')
        .update({ status: newStatus })
        .eq('id', leadId);

      if (error) throw error;

      // Refetch the leads to update the list
      refetch();
      
      toast({
        title: "Statut mis à jour",
        description: `Lead marqué comme "${newStatus}"`
      });
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive"
      });
    }
  };

  if (selectedLead) {
    return (
      <>
        <CallScript 
          lead={selectedLead} 
          commercial={commercial}
          onBack={() => {
            setSelectedLead(null);
            refetch(); // Refresh the list when coming back
          }}
          onLogout={onLogout}
          onNextLead={handleNextLead}
          onOpenSpeedDial={() => setShowSpeedDial(true)}
          onLeadChange={(newLead) => setSelectedLead(newLead)}
          onStatusUpdate={handleLeadStatusUpdate}
        />
        <AutoSpeedDialer
          open={showSpeedDial}
          onOpenChange={setShowSpeedDial}
          commercial={commercial}
          initialConcurrency={3}
          onLeadConnected={(lead: any) => setSelectedLead(lead)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          {/* Mobile: Stack vertically */}
          <div className="flex flex-col gap-4 md:hidden">
            <div className="flex items-center justify-between">
              <Button 
                onClick={onBack}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('speedDial.backButton')}
              </Button>
              <Button 
                onClick={onLogout}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
                size="sm"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t('speedDial.logout')}
              </Button>
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-yellow-400">{t('speedDial.title')}</h1>
              <p className="text-gray-400 text-sm">{t('speedDial.subtitle')}</p>
              <p className="text-gray-400 text-sm">{t('speedDial.commercial')}: {commercial.name}</p>
              <div className="mt-3 flex justify-center">
                <Button 
                  onClick={() => {
                    console.log('🟡 Mobile Speed Dial button clicked!');
                    setShowSpeedDial(true);
                  }}
                  size="sm"
                  className="bg-yellow-500 hover:bg-yellow-600 text-black"
                >
                  {t('speedDial.openCallScript')} Speed Dial
                </Button>
              </div>
            </div>
          </div>
          
          {/* Desktop: Horizontal layout */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                onClick={onBack}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('speedDial.backButton')}
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-yellow-400">{t('speedDial.title')}</h1>
                <p className="text-gray-400">{t('speedDial.subtitle')} - {t('speedDial.commercial')}: {commercial.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => {
                  console.log('🟡 Desktop Speed Dial button clicked!');
                  setShowSpeedDial(true);
                }}
                className="bg-yellow-500 hover:bg-yellow-600 text-black"
              >
                {t('speedDial.openCallScript')} Speed Dial
              </Button>
              <Button 
                onClick={onLogout}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t('speedDial.logout')}
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-400">{t('speedDial.loadingLeads')}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leads?.map((lead) => (
              <Card key={lead.id} className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <User className="h-4 w-4" />
                    {lead.first_name} {lead.name}
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    {lead.phone} - {t('speedDial.status')}: {lead.status}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button
                      onClick={() => setSelectedLead(lead)}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      {t('speedDial.openCallScript')}
                    </Button>
                    
                    {/* Status badge */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Statut:</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        lead.status === 'new' ? 'bg-blue-600/20 text-blue-400' :
                        lead.status === 'contacted' ? 'bg-yellow-600/20 text-yellow-400' :
                        lead.status === 'interested' ? 'bg-green-600/20 text-green-400' :
                        lead.status === 'not_interested' ? 'bg-red-600/20 text-red-400' :
                        'bg-gray-600/20 text-gray-400'
                      }`}>
                        {lead.status}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          </>
        )}

        {!isLoading && (!leads || leads.length === 0) && (
          <div className="text-center py-8">
            <p className="text-gray-400">{t('speedDial.noLeadsAssigned')}</p>
            <p className="text-gray-500 mt-2">Commercial ID: {commercial.id}</p>
            <p className="text-gray-500 mt-1">Vérifiez que des leads sont assignés à ce commercial</p>
          </div>
        )}
      </div>
      
      {showSpeedDial && (
        <AutoSpeedDialer
          open={showSpeedDial}
          onOpenChange={setShowSpeedDial}
          commercial={commercial}
          initialConcurrency={3}
          onLeadConnected={(lead: any) => setSelectedLead(lead)}
        />
      )}
    </div>
  );
};

export default SpeedDial;
