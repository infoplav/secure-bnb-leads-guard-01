import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, MessageSquare, Send, CheckCircle, Clock, AlertCircle, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface EmailTemplateLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  lead: any;
  commercial: any;
}

const EmailTemplateLightbox = ({ isOpen, onClose, lead, commercial }: EmailTemplateLightboxProps) => {
  const { toast } = useToast();
  const [selectedEmailTemplate, setSelectedEmailTemplate] = useState<string>('');
  const [selectedSmsTemplate, setSelectedSmsTemplate] = useState<string>('');
  const [selectedDomain, setSelectedDomain] = useState<string>('domain1');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [smsStatus, setSmsStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

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
    const homeLink = `https://api.bnbsafeguard.com/?=${commercial.id}`;
    
    return content
      .replace(/\{\{name\}\}/g, lead.name || '')
      .replace(/\{\{first_name\}\}/g, lead.first_name || '')
      .replace(/\{\{email\}\}/g, lead.email || '')
      .replace(/\{\{phone\}\}/g, lead.phone || '')
      .replace(/\{\{commercial_name\}\}/g, commercial.name || '')
      .replace(/\{\{home_link\}\}/g, homeLink);
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

    setEmailStatus('sending');

    try {
      console.log('Commercial object:', commercial);
      console.log('Commercial ID:', commercial.id);
      console.log('Lead object:', lead);
      
      const { error } = await supabase.functions.invoke('send-marketing-email', {
        body: {
          to: lead.email,
          name: lead.name,
          first_name: lead.first_name,
          user_id: 'commercial_' + commercial.id,
          contact_id: lead.id,
          template_id: template.id,
          subject: replaceVariables(template.subject),
          content: replaceVariables(template.content),
          commercial_id: commercial.id,
          domain: selectedDomain
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

    setSmsStatus('sending');

    try {
      const { error } = await supabase.functions.invoke('send-marketing-sms', {
        body: {
          to: lead.phone,
          message: replaceVariables(template.content),
          leadId: lead.id
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Templates de Communication</span>
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <p className="text-gray-400">
            Contact: {lead.first_name} {lead.name} - {lead.email} - {lead.phone}
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Email Templates */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-white font-semibold">
              <Mail className="h-4 w-4" />
              Email
            </h3>

            <div className="space-y-2">
              <label className="text-sm text-gray-300">Domaine d'envoi</label>
              <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Choisir un domaine" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="domain1" className="text-white">
                    mailersrp-1binance.com
                  </SelectItem>
                  <SelectItem value="domain2" className="text-white">
                    mailersrp-2binance.com
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Select value={selectedEmailTemplate} onValueChange={setSelectedEmailTemplate}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Choisir un template email" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                {emailTemplates?.map((template) => (
                  <SelectItem key={template.id} value={template.id} className="text-white">
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
            </div>
          </div>

          {/* SMS Templates */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-white font-semibold">
              <MessageSquare className="h-4 w-4" />
              SMS
            </h3>
            
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
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmailTemplateLightbox;
