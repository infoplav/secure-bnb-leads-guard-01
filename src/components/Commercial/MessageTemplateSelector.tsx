import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Mail, MessageSquare, Send, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface MessageTemplateSelectorProps {
  lead: any;
  commercial: any;
  onBack: () => void;
  onLogout: () => void;
}

const MessageTemplateSelector = ({ lead, commercial, onBack, onLogout }: MessageTemplateSelectorProps) => {
  const { toast } = useToast();
  const [selectedEmailTemplate, setSelectedEmailTemplate] = useState<string>('');
  const [selectedSmsTemplate, setSelectedSmsTemplate] = useState<string>('');
  // Step is automatically determined by email template (not shown in UI)
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [smsStatus, setSmsStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  // Fetch email templates
  const { data: emailTemplates } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*');
      
      if (error) throw error;
      
      // Sort numerically by extracting number from name, with Trust Wallet templates at the end
      return data?.sort((a, b) => {
        const isTrustA = a.name.toLowerCase().includes('trust');
        const isTrustB = b.name.toLowerCase().includes('trust');
        
        // Trust Wallet templates go to the end
        if (isTrustA && !isTrustB) return 1;
        if (!isTrustA && isTrustB) return -1;
        if (isTrustA && isTrustB) return a.name.localeCompare(b.name);
        
        // Regular numerical sorting for non-Trust templates
        const numA = parseInt(a.name.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.name.match(/\d+/)?.[0] || '0');
        return numA - numB;
      }) || [];
    },
  });

  // Fetch SMS templates
  const { data: smsTemplates } = useQuery({
    queryKey: ['sms-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sms_templates')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const replaceVariables = (content: string) => {
    return content
      .replace(/\{\{name\}\}/g, lead.name || '')
      .replace(/\{\{first_name\}\}/g, lead.first_name || '')
      .replace(/\{\{email\}\}/g, lead.email || '')
      .replace(/\{\{phone\}\}/g, lead.phone || '')
      .replace(/\{\{commercial_name\}\}/g, commercial.name || '');
  };

  const sendEmail = async () => {
    if (!selectedEmailTemplate) {
      toast({
        title: "Template requis",
        description: "Veuillez sélectionner un template email",
        variant: "destructive"
      });
      return;
    }

    const template = emailTemplates?.find(t => t.id === selectedEmailTemplate);
    if (!template) return;

      // Automatically determine step based on template name
      const getStepFromTemplate = (templateName: string): number => {
        const normalize = (s: string) => s.replace(/\s+/g, '').toLowerCase();
        const normalizedName = normalize(templateName);
        if (normalizedName.includes('email1')) return 1;
        if (normalizedName.includes('email2')) return 2;
        if (normalizedName.includes('email3')) return 3;
        return 1; // default
      };

      const selectedStep = getStepFromTemplate(template.name);

    try {
      const { error } = await supabase.functions.invoke('send-marketing-email', {
        body: {
          to: lead.email,
          name: lead.name,
          first_name: lead.first_name,
          user_id: lead.id,
          contact_id: lead.id,
          template_id: template.id,
          subject: replaceVariables(template.subject),
          content: replaceVariables(template.content),
          commercial_id: commercial.id,
          step: selectedStep
        }
      });

      if (error) throw error;

      setEmailStatus('sent');
      toast({
        title: "Email envoyé",
        description: `Email "${template.name}" envoyé à ${lead.email}`
      });
    } catch (error) {
      console.error('Error sending email:', error);
      setEmailStatus('error');
      toast({
        title: "Erreur",
        description: "Erreur lors de l'envoi de l'email",
        variant: "destructive"
      });
    }
  };

  const sendSms = async () => {
    if (!selectedSmsTemplate) {
      toast({
        title: "Template requis",
        description: "Veuillez sélectionner un template SMS",
        variant: "destructive"
      });
      return;
    }

    const template = smsTemplates?.find(t => t.id === selectedSmsTemplate);
    if (!template) return;

      const selectedStep = 1; // SMS is always step 1

      setSmsStatus('sending');

    try {
      const { error } = await supabase.functions.invoke('send-marketing-sms', {
        body: {
          to: lead.phone,
          message: replaceVariables(template.content),
          leadId: lead.id,
          step: selectedStep
        }
      });

      if (error) throw error;

      setSmsStatus('sent');
      toast({
        title: "SMS envoyé",
        description: `SMS "${template.name}" envoyé au ${lead.phone}`
      });
    } catch (error) {
      console.error('Error sending SMS:', error);
      setSmsStatus('error');
      toast({
        title: "Erreur",
        description: "Erreur lors de l'envoi du SMS",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sending': return <Clock className="h-4 w-4 text-yellow-400" />;
      case 'sent': return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-400" />;
      default: return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'sending': return 'Envoi en cours...';
      case 'sent': return 'Envoyé';
      case 'error': return 'Erreur';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
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
                Retour
              </Button>
              <Button 
                onClick={onLogout}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
                size="sm"
              >
                Déconnexion
              </Button>
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-yellow-400">Envoi Rapide</h1>
              <p className="text-gray-400 text-sm">
                {lead.first_name} {lead.name}
              </p>
              <p className="text-gray-400 text-sm">
                {lead.email} - {lead.phone}
              </p>
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
                Retour
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-yellow-400">Envoi Rapide</h1>
                <p className="text-gray-400">
                  Contact: {lead.first_name} {lead.name} - {lead.email} - {lead.phone}
                </p>
              </div>
            </div>
            <Button 
              onClick={onLogout}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Déconnexion
            </Button>
          </div>
        </div>

        {/* Email Template Info */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardContent className="pt-6">
            <div className="text-center text-gray-300">
              <p className="text-sm">Email1 → Étape 1 | Email2 → Étape 2 | Email3 → Étape 3 (avec wallet)</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Email Templates */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Mail className="h-5 w-5" />
                Email Rapide
              </CardTitle>
              <CardDescription className="text-gray-400">
                Sélectionnez et envoyez directement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedEmailTemplate} onValueChange={setSelectedEmailTemplate}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Choisir un template email" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  {emailTemplates?.map((template) => (
                    <SelectItem key={template.id} value={template.id} className="text-white">
                      {template.subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded text-sm text-blue-300">
                <strong>Envoi via:</strong> {
                  commercial.email_domain_preference === 'alias' ? 
                    `Alias - ${commercial.email_alias_from || 'do_not_reply@mailersp2.binance.com'}` :
                  commercial.email_domain_preference === 'domain2' ? 
                    'Domaine 2 - mailersrp-2binance.com' : 
                    'Domaine 1 - mailersrp-1binance.com'
                }
              </div>

              {selectedEmailTemplate && emailTemplates && (
                <div className="bg-gray-700 p-3 rounded-lg text-sm">
                  <p className="text-gray-300">
                    <strong>Aperçu:</strong> {emailTemplates.find(t => t.id === selectedEmailTemplate)?.subject}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button
                  onClick={sendEmail}
                  disabled={!selectedEmailTemplate || emailStatus === 'sending'}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer Email
                </Button>
                {getStatusIcon(emailStatus)}
                {emailStatus !== 'idle' && (
                  <span className="text-sm text-gray-400">{getStatusText(emailStatus)}</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* SMS Templates */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <MessageSquare className="h-5 w-5" />
                SMS Rapide
              </CardTitle>
              <CardDescription className="text-gray-400">
                Sélectionnez et envoyez directement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedSmsTemplate} onValueChange={setSelectedSmsTemplate}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Choisir un template SMS" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  {smsTemplates?.map((template) => (
                    <SelectItem key={template.id} value={template.id} className="text-white">
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedSmsTemplate && smsTemplates && (
                <div className="bg-gray-700 p-3 rounded-lg text-sm">
                  <p className="text-gray-300">
                    <strong>Aperçu:</strong> {replaceVariables(smsTemplates.find(t => t.id === selectedSmsTemplate)?.content || '').substring(0, 50)}...
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button
                  onClick={sendSms}
                  disabled={!selectedSmsTemplate || smsStatus === 'sending'}
                  className="bg-green-600 hover:bg-green-700 text-white flex-1"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer SMS
                </Button>
                {getStatusIcon(smsStatus)}
                {smsStatus !== 'idle' && (
                  <span className="text-sm text-gray-400">{getStatusText(smsStatus)}</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MessageTemplateSelector;
