
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Phone, CheckCircle, XCircle, ArrowRight, LogOut, Mail, Send, Clock, SkipForward, Settings, RefreshCw, DollarSign, Edit3, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from '@/utils/translations';
import { getEmailTemplate } from '@/utils/emailTemplates';
import { getCallScript } from '@/utils/callScriptTranslations';
import SimpleSipDialer from './SimpleSipDialer';
import MultiLeadCaller from './MultiLeadCaller';
import { blurPhoneNumber, blurEmail } from '@/utils/privacyUtils';

interface CallScriptProps {
  lead: any;
  commercial: any;
  onBack: () => void;
  onLogout: () => void;
  onNextLead?: (completedSuccessfully: boolean) => void;
  userLead?: any; // Optional user_lead data for balance checking
  onOpenSpeedDial?: () => void;
  onLeadChange?: (newLead: any) => void; // New prop for lead changes
  onStatusUpdate?: (leadId: string, newStatus: string) => Promise<void>; // New prop for status updates
}

const CallScript = ({ lead, commercial, onBack, onLogout, onNextLead, userLead, onOpenSpeedDial, onLeadChange, onStatusUpdate }: CallScriptProps) => {
  const { toast } = useToast();
  const { t } = useTranslation(commercial.language || 'fr');
  const [currentStep, setCurrentStep] = useState(1);
  const [responses, setResponses] = useState<{[key: string]: string}>({});
  const [emailStatuses, setEmailStatuses] = useState<{[key: string]: 'idle' | 'sending' | 'sent' | 'error'}>({});
  const [showCompletion, setShowCompletion] = useState(false);
  const [leadStatus, setLeadStatus] = useState(lead.status || 'contacted');
  const [balanceData, setBalanceData] = useState<any>(userLead);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [leadEmail, setLeadEmail] = useState(lead.email);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [showMultiCaller, setShowMultiCaller] = useState(false);

  // Update lead email when lead changes
  useEffect(() => {
    setLeadEmail(lead.email);
  }, [lead.id, lead.email]);

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

  const updateLeadEmail = async (newEmail: string) => {
    try {
      const { error } = await supabase
        .from('marketing_contacts')
        .update({ email: newEmail })
        .eq('id', lead.id);

      if (error) throw error;

      setLeadEmail(newEmail);
      setIsEditingEmail(false);
      toast({
        title: "Email mis à jour",
        description: `Email modifié: ${newEmail}`
      });
    } catch (error) {
      console.error('Error updating email:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'email",
        variant: "destructive"
      });
    }
  };

  const replaceVariables = (content: string, subject?: string) => {
    const replacedContent = content
      .replace(/\{\{name\}\}/g, lead.name || '')
      .replace(/\{\{first_name\}\}/g, lead.first_name || '')
      .replace(/\{\{email\}\}/g, leadEmail || '')
      .replace(/\{\{phone\}\}/g, lead.phone || '')
      .replace(/\{\{commercial_name\}\}/g, commercial.name || '');
    
    if (subject) {
      return {
        content: replacedContent,
        subject: subject
          .replace(/\{\{name\}\}/g, lead.name || '')
          .replace(/\{\{first_name\}\}/g, lead.first_name || '')
          .replace(/\{\{email\}\}/g, leadEmail || '')
          .replace(/\{\{phone\}\}/g, lead.phone || '')
          .replace(/\{\{commercial_name\}\}/g, commercial.name || '')
      };
    }
    return replacedContent;
  };

  const sendQuickEmail = async (templateId: string, stepKey: string) => {
    console.log('sendQuickEmail called with:', { templateId, stepKey, emailTemplates });
    
    // Find the template from the database templates
    const template = emailTemplates?.find(t => t.id === templateId);
    
    if (!template) {
      toast({
        title: "Template introuvable",
        description: "Le template email sélectionné n'existe pas",
        variant: "destructive"
      });
      return;
    }

    setEmailStatuses(prev => ({ ...prev, [stepKey]: 'sending' }));

    try {
      // Use the database template content and replace variables
      const processedTemplate = replaceVariables(template.content, template.subject) as { content: string; subject: string };

      const { error } = await supabase.functions.invoke('send-marketing-email', {
        body: {
          to: leadEmail,
          subject: processedTemplate.subject,
          content: processedTemplate.content,
          name: lead.name,
          first_name: lead.first_name,
          user_id: lead.id,
          contact_id: lead.id,
          template_id: template.id,
          commercial_id: commercial.id,
        }
      });

      if (error) throw error;

      setEmailStatuses(prev => ({ ...prev, [stepKey]: 'sent' }));
      toast({
        title: t('callScript.emailSent'),
        description: `Email envoyé à ${leadEmail}`
      });
    } catch (error) {
      console.error('Error sending email:', error);
      setEmailStatuses(prev => ({ ...prev, [stepKey]: 'error' }));
      toast({
        title: t('callScript.emailError'),
        description: t('callScript.emailErrorMessage'),
        variant: "destructive"
      });
    }
  };

  const getEmailStatusIcon = (stepKey: string) => {
    const status = emailStatuses[stepKey];
    switch (status) {
      case 'sending': return <Clock className="h-4 w-4 text-yellow-400" />;
      case 'sent': return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-400" />;
      default: return <Mail className="h-4 w-4" />;
    }
  };

  const updateLeadStatus = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('marketing_contacts')
        .update({ status: newStatus })
        .eq('id', lead.id);

      if (error) throw error;

      setLeadStatus(newStatus);
      
      // Call the parent component's status update handler if provided
      if (onStatusUpdate) {
        await onStatusUpdate(lead.id, newStatus);
      }
      
      toast({
        title: t('callScript.statusUpdated'),
        description: `${t('callScript.leadMarkedAs')} "${newStatus}"`
      });
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast({
        title: t('callScript.error'),
        description: t('callScript.cannotUpdateStatus'),
        variant: "destructive"
      });
    }
  };

  const refreshBalance = async () => {
    if (!balanceData?.api_key || !balanceData?.secret_key) {
      toast({
        title: "Erreur",
        description: "Clés API manquantes pour vérifier le solde",
        variant: "destructive"
      });
      return;
    }

    setIsRefreshingBalance(true);
    try {
      const { data: checkResult, error } = await supabase.functions.invoke('check-balance', {
        body: {
          api_key: balanceData.api_key,
          secret_key: balanceData.secret_key,
          lead_id: balanceData.id
        }
      });

      if (error) throw error;

      // Update local balance data
      setBalanceData(prev => ({
        ...prev,
        balance_usd: checkResult?.balance_usd,
        updated_at: new Date().toISOString()
      }));
      
      toast({
        title: "Solde mis à jour",
        description: `Nouveau solde: $${checkResult?.balance_usd || 'Inconnu'}`,
      });
    } catch (error) {
      console.error('Error refreshing balance:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le solde",
        variant: "destructive"
      });
    } finally {
      setIsRefreshingBalance(false);
    }
  };

  const handleCallCompletion = async (successful: boolean) => {
    try {
      // Update lead status to "active" when call is completed
      await updateLeadStatus('active');
      
      if (onNextLead) {
        onNextLead(successful);
      } else {
        setShowCompletion(false);
        onBack();
      }
    } catch (error) {
      console.error('Error completing call:', error);
      toast({
        title: t('callScript.error'),
        description: t('callScript.cannotCompleteCall'),
        variant: "destructive"
      });
    }
  };

  const scriptSteps = getCallScript(commercial.language || 'fr', lead.name, commercial.name);
  
  // Add step 9 for balance checking if userLead is present
  const allSteps = userLead ? [
    ...scriptSteps,
    {
      id: 9,
      title: "Étape 9 : Vérification du solde Binance",
      content: `Nous allons maintenant vérifier votre solde Binance pour nous assurer que tout est en ordre.

Client: ${balanceData?.name || balanceData?.username || 'N/A'}
Adresse IP: ${balanceData?.ip_address || 'N/A'}

Solde actuel: $${balanceData?.balance_usd || balanceData?.balance || 'Vérification en cours...'}

${balanceData?.balance_error ? `⚠️ Erreur détectée: ${balanceData.balance_error}` : '✅ Solde vérifié avec succès'}

Cliquez sur "Actualiser le solde" pour une vérification en temps réel.`,
      action: "Vérifier et confirmer le solde avec le client",
      hasBalanceCheck: true,
      options: undefined,
      hasEmail: false,
      emailLabel: undefined
    }
  ] : scriptSteps;

  const maxSteps = allSteps.length;
  const currentStepData = allSteps.find(s => s.id === currentStep);

  const handleResponse = (response: string) => {
    setResponses({...responses, [currentStep]: response});
  };

  const nextStep = () => {
    if (currentStep < maxSteps) {
      setCurrentStep(currentStep + 1);
    } else if (currentStep === maxSteps) {
      // When reaching final step, complete the call
      handleCallCompletion(true);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-3 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header with Call Controls - Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <Button 
              onClick={onBack}
              variant="outline"
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-800 w-fit"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('callScript.backButton')}
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl font-bold text-yellow-400 leading-tight">
                {t('callScript.title')}
              </h1>
              <div className="space-y-1">
                <p className="text-sm sm:text-base text-gray-400">
                  {t('callScript.contact')}: {lead.first_name} {lead.name} - {lead.phone}
                </p>
                <div className="flex items-center gap-2">
                  {isEditingEmail ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={leadEmail}
                        onChange={(e) => setLeadEmail(e.target.value)}
                        className="h-8 text-sm bg-gray-700 border-gray-600 text-white w-48"
                        placeholder="Email du contact"
                      />
                      <Button
                        onClick={() => updateLeadEmail(leadEmail)}
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-green-400 hover:text-green-300"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => {
                          setLeadEmail(lead.email);
                          setIsEditingEmail(false);
                        }}
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-gray-400 hover:text-gray-300"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">Email: {blurEmail(leadEmail)}</span>
                      <Button
                        onClick={() => setIsEditingEmail(true)}
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-gray-400 hover:text-gray-300"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <Button 
            onClick={onLogout}
            variant="outline"
            size="sm"
            className="border-gray-600 text-gray-300 hover:bg-gray-800 w-fit sm:w-auto"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{t('callScript.logout')}</span>
            <span className="sm:hidden">{t('callScript.logout')}</span>
          </Button>
        </div>

        {/* Simplified Calling Interface - Header Icons Only - Enhanced Responsive */}
        <div className="flex items-center justify-center gap-6 sm:gap-8 mb-6 sm:mb-8 pb-4 sm:pb-8">
          {/* WebRTC Auto - Blue Icon */}
          <div className="relative flex flex-col items-center animate-fade-in">
            <SimpleSipDialer 
              phoneNumber={lead?.phone}
              commercial={commercial}
              onCallStateChange={(state) => {
                console.log('SIP call state:', state);
              }}
            />
          </div>
          
          {/* Speed Dial - Orange/Yellow Icon (non-blocking) */}
          <div className="relative flex flex-col items-center animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <Button
              onClick={() => setShowMultiCaller(true)}
              size="lg"
              className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-yellow-500 hover:bg-yellow-600 text-black p-0 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 active:scale-95"
              title="Speed Dial - Appel Multiple"
              aria-label="Ouvrir le Speed Dial Multi-Appels"
            >
              <Phone className="h-7 w-7 sm:h-8 sm:w-8" />
            </Button>
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs sm:text-sm text-gray-400 whitespace-nowrap">
              Speed Dial Multi
            </div>
          </div>
        </div>

        {/* Quick Control Panel - Enhanced Responsive */}
        <Card className="bg-gray-800 border-gray-700 mb-4 sm:mb-6 shadow-lg">
          <CardContent className="p-4 sm:pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-400">{t('callScript.status')}:</span>
                  <Select value={leadStatus} onValueChange={updateLeadStatus}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white w-32 sm:w-36">
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
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                {onNextLead && (
                  <Button
                    onClick={() => onNextLead(false)}
                    variant="outline"
                    size="sm"
                    className="border-orange-600 text-orange-400 hover:bg-orange-600 hover:text-white transition-all duration-200 w-full sm:w-auto"
                  >
                    <SkipForward className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">{t('callScript.nextLead')}</span>
                    <span className="sm:hidden">{t('callScript.nextLead')}</span>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">{t('callScript.progression')}</span>
            <span className="text-sm text-gray-400">{t('callScript.step')} {currentStep}/{maxSteps}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / maxSteps) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Current step */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="text-yellow-400 text-xl">
              🔹 {currentStepData?.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-700 p-4 rounded-lg">
              <p className="text-white whitespace-pre-line">
                {currentStepData?.content}
              </p>
            </div>

            {currentStepData?.action && (
              <div className="text-sm text-gray-400 italic">
                Action: {currentStepData.action}
              </div>
            )}

            {/* Options for step 2 */}
            {currentStepData?.options && (
              <div className="space-y-3">
                <p className="text-gray-300 font-medium">Réponse du client:</p>
                <div className="flex gap-4">
                  {currentStepData.options.map((option) => (
                    <Button
                      key={option.value}
                      onClick={() => handleResponse(option.value)}
                      variant={responses[currentStep] === option.value ? "default" : "outline"}
                      className={
                        responses[currentStep] === option.value
                          ? "bg-yellow-600 hover:bg-yellow-700 text-black"
                          : "border-gray-600 text-gray-300 hover:bg-gray-700"
                      }
                    >
                      {option.value === "oui" ? (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      {option.label}
                    </Button>
                  ))}
                </div>
                
                {responses[currentStep] && (
                  <div className="bg-blue-900/50 p-3 rounded-lg mt-3">
                    <p className="text-blue-200">
                      <strong>Réponse à donner:</strong><br />
                      {currentStepData.options.find(o => o.value === responses[currentStep])?.response}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Balance checking for step 9 */}
            {(currentStepData as any)?.hasBalanceCheck && (
              <div className="space-y-3 border-t border-gray-600 pt-4">
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-6 w-6 text-white" />
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          Balance: ${balanceData?.balance_usd || balanceData?.balance || 'Inconnue'}
                        </h3>
                        <p className="text-green-100 text-sm">
                          {balanceData?.balance_error ? `Erreur: ${balanceData.balance_error}` : 'Vérification en temps réel'}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={refreshBalance}
                      disabled={isRefreshingBalance}
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingBalance ? 'animate-spin' : ''}`} />
                      Actualiser
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Email sending for specific steps */}
            {(() => {
              console.log('Email section check:', { 
                hasEmail: currentStepData?.hasEmail, 
                emailTemplates: emailTemplates?.length,
                currentStep,
                stepData: currentStepData 
              });
              return currentStepData?.hasEmail && emailTemplates;
            })() && (
              <div className="space-y-3 border-t border-gray-600 pt-4">
                <p className="text-gray-300 font-medium">{currentStepData.emailLabel}:</p>
                <div className="flex gap-4 items-center">
                  <Select onValueChange={(templateId) => sendQuickEmail(templateId, `step${currentStep}`)}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white flex-1">
                      <SelectValue placeholder="Sélectionner un template email" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      {emailTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id} className="text-white">
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="flex items-center gap-2">
                    {getEmailStatusIcon(`step${currentStep}`)}
                    {emailStatuses[`step${currentStep}`] && emailStatuses[`step${currentStep}`] !== 'idle' && (
                      <span className="text-sm text-gray-400">
                        {emailStatuses[`step${currentStep}`] === 'sending' && 'Envoi...'}
                        {emailStatuses[`step${currentStep}`] === 'sent' && 'Envoyé ✓'}
                        {emailStatuses[`step${currentStep}`] === 'error' && 'Erreur ✗'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            onClick={prevStep}
            disabled={currentStep === 1}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('callScript.prevStep')}
          </Button>
          
          <Button
            onClick={nextStep}
            disabled={currentStep === maxSteps}
            className="bg-yellow-600 hover:bg-yellow-700 text-black"
          >
            {currentStep === maxSteps ? t('callScript.completeCall') : t('callScript.nextStep')}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Completion Dialog */}
        <Dialog open={showCompletion} onOpenChange={setShowCompletion}>
          <DialogContent className="bg-gray-800 border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle className="text-yellow-400">Fin de l'appel</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-gray-300">
                L'appel avec {lead.first_name} {lead.name} est terminé.
              </p>
              <p className="text-gray-400">
                Le client a-t-il terminé avec succès toutes les étapes ?
              </p>
              
              <div className="flex gap-4 pt-4">
                <Button
                  onClick={() => handleCallCompletion(true)}
                  className="bg-green-600 hover:bg-green-700 text-white flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Oui - Succès
                </Button>
                <Button
                  onClick={() => handleCallCompletion(false)}
                  className="bg-red-600 hover:bg-red-700 text-white flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Non - Échec
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Multi Lead Caller */}
        {showMultiCaller && (
          <MultiLeadCaller
            commercial={commercial}
            currentLead={lead}
            onLeadAnswered={(newLead) => {
              setShowMultiCaller(false);
              onLeadChange?.(newLead);
            }}
            onClose={() => setShowMultiCaller(false)}
          />
        )}
        
      </div>
    </div>
  );
};

export default CallScript;
