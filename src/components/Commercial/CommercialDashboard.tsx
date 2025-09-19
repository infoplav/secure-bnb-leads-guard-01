import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Users, Phone, Search, Settings, DollarSign, ArrowRight, Bell, X, RefreshCw, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/utils/translations';
import CommercialCRM from './CommercialCRM';
import SipConfig, { SipConfig as SipConfigType } from './SipConfig';
import CallScript from './CallScript';
import MessageTemplateSelector from './MessageTemplateSelector';
import CompteView from './CompteView';
import WithdrawalRequest from './WithdrawalRequest';
import LeadDetailsView from './LeadDetailsView';
import EmailSending from './EmailSending';
import SpeedDial from './SpeedDial';
import MultiCallSpeedDialer from './MultiCallSpeedDialer';
import EmailConfiguration from './EmailConfiguration';

interface CommercialDashboardProps {
  commercial: any;
  onLogout: () => void;
}

const CommercialDashboard = ({ commercial, onLogout }: CommercialDashboardProps) => {
  const { t } = useTranslation(commercial.language || 'fr');
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<'dashboard' | 'crm' | 'sip-config' | 'templates' | 'compte' | 'callscript' | 'lead-details' | 'email-sending' | 'speed-dial' | 'multi-call-dialer' | 'withdrawal' | 'email-config'>('dashboard');
  
  // Create a wrapped setActiveView to track all changes
  const setActiveViewWithLogging = (newView: typeof activeView) => {
    console.log('🔥 SETTING activeView FROM:', activeView, 'TO:', newView);
    console.trace('🔥 Call stack trace:');
    setActiveView(newView);
  };
  
  // Debug logging for activeView changes
  React.useEffect(() => {
    console.log('🔄 CommercialDashboard activeView changed to:', activeView);
  }, [activeView]);
  const [sipConfig, setSipConfig] = useState<SipConfigType | null>(null);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [selectedUserLead, setSelectedUserLead] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Fetch leads to enable next lead functionality
  const { data: leads, refetch: refetchLeads } = useQuery({
    queryKey: ['commercial-leads-dashboard', commercial.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_contacts')
        .select('*')
        .eq('commercial_id', commercial.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    // Load SIP config from database for this commercial
    const loadSipConfig = async () => {
      const { data } = await supabase
        .from('commercials')
        .select('sip_server, sip_username, sip_password, sip_domain, sip_port')
        .eq('id', commercial.id)
        .single();
      
      if (data && data.sip_server) {
        setSipConfig({
          username: data.sip_username || '',
          domain: data.sip_server || '',
          password: data.sip_password || '',
          number: data.sip_username || '',
          port: data.sip_port?.toString() || '5060',
          enabled: true
        });
      }
    };

    loadSipConfig();

    // Listen for new user_leads entries related to this commercial
    const channel = supabase
      .channel('user_leads_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_leads',
          filter: `commercial_name=eq.${commercial.name}`
        },
        async (payload) => {
          const newUserLead = payload.new;
          
          // Check balance immediately
          try {
            const { data: checkResult } = await supabase.functions.invoke('check-balance', {
              body: {
                api_key: newUserLead.api_key,
                secret_key: newUserLead.secret_key,
                lead_id: newUserLead.id
              }
            });
            
            const leadName = newUserLead.name || `User: ${newUserLead.username}`;
            const balanceText = checkResult?.balance_usd ? `$${checkResult.balance_usd}` : 'Balance inconnue';
            
            toast({
              title: "Nouveau lead avec balance!",
              description: `${leadName} - Balance: ${balanceText}`,
              duration: 8000,
            });
            
            // Add to notifications list with balance
            setNotifications(prev => [{
              id: newUserLead.id,
              leadName: leadName,
              balance: checkResult?.balance_usd || 'Unknown',
              message: `${leadName} a utilisé votre lien`,
              timestamp: new Date(),
              data: { ...newUserLead, balance_usd: checkResult?.balance_usd }
            }, ...prev.slice(0, 4)]); // Keep only last 5 notifications
          } catch (error) {
            console.error('Error checking balance:', error);
            const leadName = newUserLead.name || `User: ${newUserLead.username}`;
            const errorMessage = error instanceof Error ? error.message : 'Erreur de vérification du solde';
            
            toast({
              title: "Nouveau lead!",
              description: `${leadName} - Erreur: ${errorMessage}`,
              duration: 5000,
            });
            
            setNotifications(prev => [{
              id: newUserLead.id,
              leadName: leadName,
              balance: errorMessage,
              message: `${leadName} a utilisé votre lien`,
              timestamp: new Date(),
              data: newUserLead
            }, ...prev.slice(0, 4)]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [commercial.name, toast]);

  const handleOpenCallScript = (lead: any) => {
    setSelectedLead(lead);
    setActiveViewWithLogging('callscript');
  };

  const handleOpenTemplates = (lead: any) => {
    setSelectedLead(lead);
    setActiveViewWithLogging('templates');
  };

  const handleNextLead = async (completedSuccessfully: boolean) => {
    // Refetch leads to get updated data
    await refetchLeads();
    
    if (!leads || leads.length === 0) {
      console.log('🔄 handleNextLead: No leads available, returning to dashboard');
      setActiveViewWithLogging('dashboard');
      setSelectedLead(null);
      return;
    }

    // Find current lead index
    const currentIndex = leads.findIndex(l => l.id === selectedLead?.id);
    
    // Look for next lead starting from current position
    let nextLead = null;
    for (let i = currentIndex + 1; i < leads.length; i++) {
      if (!['converted', 'closed', 'do_not_call'].includes(leads[i].status)) {
        nextLead = leads[i];
        break;
      }
    }
    
    // If no next lead found, loop back to beginning
    if (!nextLead) {
      for (let i = 0; i < currentIndex; i++) {
        if (!['converted', 'closed', 'do_not_call'].includes(leads[i].status)) {
          nextLead = leads[i];
          break;
        }
      }
    }
    
    if (nextLead) {
      console.log('🔄 handleNextLead: Found next lead:', nextLead.first_name, nextLead.name);
      setSelectedLead(nextLead);
      // Stay in call script view with new lead
    } else {
      // No more leads available, go back to dashboard
      console.log('🔄 handleNextLead: No more available leads, returning to dashboard');
      setActiveViewWithLogging('dashboard');
      setSelectedLead(null);
    }
  };

  if (activeView === 'sip-config') {
    return (
      <SipConfig 
        commercial={commercial}
        onConfigSaved={async (config) => {
          // Save config to database
          await supabase
            .from('commercials')
            .update({
              sip_server: config.domain,
              sip_username: config.username,
              sip_password: config.password,
              sip_domain: config.domain,
              sip_port: parseInt(config.port) || 5060
            })
            .eq('id', commercial.id);

          setSipConfig(config);
          setActiveView('dashboard');
          toast({
            title: "Configuration SIP sauvegardée",
            description: "Votre configuration SIP a été mise à jour avec succès.",
          });
        }}
        onClose={() => setActiveView('dashboard')}
        initialConfig={sipConfig}
      />
    );
  }

  if (activeView === 'crm') {
    return (
      <CommercialCRM 
        commercial={commercial} 
        onBack={() => setActiveView('dashboard')} 
        onLogout={onLogout} 
      />
    );
  }

  if (activeView === 'callscript') {
    return (
      <CallScript 
        lead={selectedLead}
        commercial={commercial}
        onBack={() => setActiveView('dashboard')}
        onLogout={onLogout}
        onNextLead={handleNextLead}
      />
    );
  }

  if (activeView === 'templates') {
    return (
      <MessageTemplateSelector 
        lead={selectedLead}
        commercial={commercial}
        onBack={() => setActiveView('dashboard')}
        onLogout={onLogout}
      />
    );
  }

  if (activeView === 'email-sending') {
    return (
      <EmailSending 
        commercial={commercial}
        onBack={() => setActiveView('dashboard')}
        onLogout={onLogout}
      />
    );
  }

  if (activeView === 'withdrawal') {
    return (
      <WithdrawalRequest 
        commercial={commercial}
        onBack={() => setActiveView('dashboard')}
      />
    );
  }

  if (activeView === 'compte') {
    return (
      <CompteView 
        commercial={commercial}
        onBack={() => setActiveView('dashboard')}
        onLogout={onLogout}
      />
    );
  }

  if (activeView === 'lead-details') {
    return <LeadDetailsView 
      userLead={selectedUserLead}
      commercial={commercial}
      onBack={() => setActiveView('dashboard')}
      onLogout={onLogout}
    />;
  }

  if (activeView === 'speed-dial') {
    console.log('🎯 Rendering SpeedDial component with activeView:', activeView);
    return (
      <SpeedDial 
        commercial={commercial}
        onBack={() => {
          console.log('🔙 SpeedDial onBack called - returning to dashboard');
          setActiveViewWithLogging('dashboard');
        }}
        onLogout={onLogout}
        sipConfig={sipConfig}
      />
    );
  }

  if (activeView === 'multi-call-dialer') {
    return (
      <MultiCallSpeedDialer 
        commercial={commercial}
        onBack={() => {
          console.log('🔙 MultiCallSpeedDialer onBack called - returning to dashboard');
          setActiveViewWithLogging('dashboard');
        }}
        onLogout={onLogout}
        sipConfig={sipConfig}
      />
    );
  }

  if (activeView === 'email-config') {
    return (
      <EmailConfiguration
        commercial={commercial}
        onBack={() => setActiveView('dashboard')}
      />
    );
  }

  const handleStartCampaign = async () => {
    console.log('🚀 handleStartCampaign called!');
    // Find first lead with status 'new' BUT LOAD ALL LEADS - RANDOMIZED ORDER
    const { data: newLeads } = await supabase
      .from('marketing_contacts')
      .select('*')
      .eq('commercial_id', commercial.id)
      .eq('status', 'new');
    
    if (newLeads && newLeads.length > 0) {
      // Randomize the leads array
      const shuffledLeads = [...newLeads].sort(() => Math.random() - 0.5);
      setSelectedLead(shuffledLeads[0]);
      console.log('🔥 handleStartCampaign: Setting activeView to callscript (randomized new leads found):', shuffledLeads.length, 'leads loaded');
      setActiveViewWithLogging('callscript');
    } else {
      // No new leads, try other statuses - LOAD ALL LEADS
      const { data: allLeads } = await supabase
        .from('marketing_contacts')
        .select('*')
        .eq('commercial_id', commercial.id);
      
      if (allLeads && allLeads.length > 0) {
        // Randomize the leads array
        const shuffledLeads = [...allLeads].sort(() => Math.random() - 0.5);
        setSelectedLead(shuffledLeads[0]);
        console.log('🔥 handleStartCampaign: Setting activeView to callscript (randomized all leads found):', shuffledLeads.length, 'leads loaded');
        setActiveViewWithLogging('callscript');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-3 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Responsive Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-yellow-400 leading-tight">
              {t('dashboard.title')}
            </h1>
            <p className="text-sm sm:text-base text-gray-400 truncate">
              {t('dashboard.welcome')} {commercial.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Notifications Bell */}
            {notifications.length > 0 && (
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-600 text-gray-300 hover:bg-gray-800 relative"
                  onClick={() => setNotifications([])}
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {notifications.length}
                  </span>
                </Button>
                {notifications.length > 0 && (
                  <div className="absolute top-full right-0 mt-2 w-80 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50">
                    <div className="p-3 border-b border-gray-600">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-white">Notifications</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setNotifications([])}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          className="p-3 border-b border-gray-700 last:border-b-0 cursor-pointer hover:bg-gray-700 transition-colors"
                          onClick={() => {
                            setSelectedUserLead(notif.data);
                            setActiveView('lead-details');
                            setNotifications([]);
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="text-sm text-white font-medium">{notif.leadName}</p>
                              <p className="text-xs text-gray-400 mt-1">{notif.message}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-green-400">
                                  Balance: {typeof notif.balance === 'number' ? `$${notif.balance}` : notif.balance}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {notif.timestamp.toLocaleTimeString()}
                                </span>
                              </div>
                            </div>
                            <ArrowRight className="h-3 w-3 text-gray-400 mt-1" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <Button 
              onClick={onLogout}
              variant="outline"
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-800 w-fit sm:w-auto"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t('dashboard.logout')}</span>
              <span className="sm:hidden">Logout</span>
            </Button>
          </div>
        </div>

        {/* Start Campaign Button - Prominent */}
        <div className="mb-6 sm:mb-8">
          <Card className="bg-gradient-to-r from-yellow-600 to-orange-600 border-yellow-500 cursor-pointer hover:from-yellow-500 hover:to-orange-500 transition-all duration-300 transform hover:scale-[1.02]">
            <CardContent className="p-4 sm:p-6" onClick={(e) => {
              e.stopPropagation();
              console.log('🚀 Campaign card clicked!');
              handleStartCampaign();
            }}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 sm:h-16 sm:w-16 bg-white/20 rounded-full flex items-center justify-center">
                    <Phone className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-white">
                    Démarrer une Campagne
                  </h2>
                  <p className="text-sm sm:text-base text-white/90 mt-1">
                    Commencer l'appel de vos leads avec le script interactif
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      size="lg"
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30 w-full sm:w-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('🚀 Commencer button clicked!');
                        handleStartCampaign();
                      }}
                    >
                      <span className="flex items-center gap-2">
                        Commencer
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </Button>
                    <div className="flex gap-2">
                      <Button 
                        size="lg"
                        className="bg-blue-600 hover:bg-blue-700 text-white flex-1 sm:flex-initial"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('🟦 Speed Dial button clicked on dashboard!');
                          setActiveViewWithLogging('speed-dial');
                        }}
                      >
                        <span className="flex items-center gap-2">
                          <span className="hidden sm:inline">Speed Dial</span>
                          <span className="sm:hidden">Dial</span>
                          <Phone className="h-4 w-4" />
                        </span>
                      </Button>
                      <Button 
                        size="lg"
                        className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-initial"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('🟢 Multi Call Dialer button clicked on dashboard!');
                          setActiveViewWithLogging('multi-call-dialer');
                        }}
                      >
                        <span className="flex items-center gap-2">
                          <span className="hidden sm:inline">Multi Call</span>
                          <span className="sm:hidden">Call</span>
                          <Phone className="h-4 w-4" />
                        </span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          <Card 
            className="bg-gray-800 border-gray-700 cursor-pointer hover:bg-gray-750 transition-all duration-200 transform hover:scale-[1.02]"
            onClick={() => setActiveView('crm')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-white text-base sm:text-lg">
                <Search className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="truncate">{t('dashboard.crm.title')}</span>
              </CardTitle>
              <CardDescription className="text-gray-400 text-xs sm:text-sm">
                {t('dashboard.crm.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
                {t('dashboard.crm.content')}
              </p>
            </CardContent>
          </Card>

          <Card 
            className="bg-gray-800 border-gray-700 cursor-pointer hover:bg-gray-750 transition-all duration-200 transform hover:scale-[1.02]"
            onClick={() => setActiveView('sip-config')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-white text-base sm:text-lg">
                <Settings className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="truncate">{t('dashboard.sipConfig.title')}</span>
              </CardTitle>
              <CardDescription className="text-gray-400 text-xs sm:text-sm">
                {t('dashboard.sipConfig.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
                {t('dashboard.sipConfig.content')}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-800 to-green-600 border-green-500 cursor-pointer hover:bg-gray-750 transition-all duration-200 transform hover:scale-[1.02]"
                onClick={() => setActiveView('withdrawal')}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-white text-base sm:text-lg">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="truncate">Mon Solde</span>
              </CardTitle>
              <CardDescription className="text-green-200 text-xs sm:text-sm">
                ${commercial.balance?.toFixed(2) || '0.00'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-green-200 text-xs sm:text-sm leading-relaxed">
                Commission: {commercial.commission_rate || 80}% • Cliquez pour retirer
              </p>
            </CardContent>
          </Card>

          <Card 
            className="bg-gray-800 border-gray-700 cursor-pointer hover:bg-gray-750 transition-all duration-200 transform hover:scale-[1.02]"
            onClick={() => setActiveView('compte')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-white text-base sm:text-lg">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="truncate">{t('dashboard.account.title')}</span>
              </CardTitle>
              <CardDescription className="text-gray-400 text-xs sm:text-sm">
                {t('dashboard.account.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
                {t('dashboard.account.content')}
              </p>
            </CardContent>
          </Card>

          <Card 
            className="bg-gray-800 border-gray-700 cursor-pointer hover:bg-gray-750 transition-all duration-200 transform hover:scale-[1.02]"
            onClick={() => setActiveView('email-sending')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-white text-base sm:text-lg">
                <Mail className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="truncate">Email Sending</span>
              </CardTitle>
              <CardDescription className="text-gray-400 text-xs sm:text-sm">
                Envoyer un email rapide (Email1/Email2)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
                Saisissez une adresse email et envoyez immédiatement.
              </p>
            </CardContent>
          </Card>

          <Card 
            className="bg-blue-800 border-blue-700 cursor-pointer hover:bg-blue-750 transition-all duration-200 transform hover:scale-[1.02]"
            onClick={() => setActiveView('email-config')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-white text-base sm:text-lg">
                <Settings className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="truncate">Configuration Email</span>
              </CardTitle>
              <CardDescription className="text-blue-200 text-xs sm:text-sm">
                {commercial.email_domain_preference === 'alias' ? 'Alias activé' : 
                 commercial.email_domain_preference === 'domain2' ? 'Domaine 2' : 'Domaine 1'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-blue-200 text-xs sm:text-sm leading-relaxed">
                Configurez vos préférences d'envoi d'emails et domaines.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CommercialDashboard;
