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
    const homeLink = `https://fr.bnbsafeguard.com/?=${commercial.id}`;
    
    return content
      .replace(/\{\{name\}\}/g, lead.name || '')
      .replace(/\{\{first_name\}\}/g, lead.first_name || '')
      .replace(/\{\{email\}\}/g, lead.email || '')
      .replace(/\{\{phone\}\}/g, lead.phone || '')
      .replace(/\{\{commercial_name\}\}/g, commercial.name || '')
      .replace(/\{\{home_link\}\}/g, homeLink)
      .replace(/\{\{link\}\}/g, homeLink)
      .replace(/https?:\/\/api\.bnbsafeguard\.com/gi, 'https://fr.bnbsafeguard.com');
  };

  const replaceWalletPlaceholders = (text: string, wallet: string) => {
    if (!wallet) return text;
    const normalize = (s: string) => s
      .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
      .replace(/\u00A0/g, ' ')
      .replace(/&lbrace;|&lcub;|&#123;|&#x7B;|\uFF5B/gi, '{')
      .replace(/&rbrace;|&rcub;|&#125;|&#x7D;|\uFF5D/gi, '}');

    let t = normalize(text);

    // Simple {{wallet}} with optional spaces/nbsp/zero-width
    t = t.replace(/{{[\s\u00A0\u200B\u200C\u200D\uFEFF]*wallet[\s\u00A0\u200B\u200C\u200D\uFEFF]*}}/gi, wallet);
    // HTML-encoded braces
    t = t.replace(/&#123;&#123;\s*wallet\s*&#125;&#125;/gi, wallet);
    // Triple braces {{{wallet}}}
    t = t.replace(/\{\{\{[^}]*wallet[^}]*\}\}\}/gi, wallet);

    // Broken-letter variants like {{ w<a>al</a>l e t }}
    const walletWordPattern = 'w(?:[\\s\\u00A0\\u200B\\u200C\\u200D\\uFEFF]|<[^>]+>)*a(?:[\\s\\u00A0\\u200B\\u200C\\u200D\\uFEFF]|<[^>]+>)*l(?:[\\s\\u00A0\\u200B\\u200C\\u200D\\uFEFF]|<[^>]+>)*l(?:[\\s\\u00A0\\u200B\\u200C\\u200D\\uFEFF]|<[^>]+>)*e(?:[\\s\\u00A0\\u200B\\u200C\\u200D\\uFEFF]|<[^>]+>)*t';
    const brokenWalletRegex = new RegExp(`\\{\\{(?:[\\s\\u00A0\\u200B\\u200C\\u200D\\uFEFF]|<[^>]+>)*${walletWordPattern}(?:[\\s\\u00A0\\u200B\\u200C\\u200D\\uFEFF]|<[^>]+>)*\\}\\}`, 'ig');
    let brokenSafety = 10;
    while (brokenSafety-- > 0 && brokenWalletRegex.test(t)) {
      t = t.replace(brokenWalletRegex, wallet);
    }

    // Complex placeholders split by inline tags around braces
    const complexWalletRegex = /\{(?:\s|&nbsp;|<[^>]+>)*\{(?:[\s\u00A0\uFEFF]|<[^>]+>)*wallet(?:[\s\u00A0\uFEFF]|<[^>]+>)*\}(?:[\s\u00A0\uFEFF]|<[^>]+>)*\}/i;
    let safetyCounter = 10;
    while (safetyCounter-- > 0 && complexWalletRegex.test(t)) {
      t = t.replace(complexWalletRegex, wallet);
    }

    // Final safeguards
    if (/{{[^}]*wallet[^}]*}}/i.test(t)) {
      t = t.replace(/{{[^}]*wallet[^}]*}}/gi, wallet);
    }

    // Ultimate fallback: allow tags/spaces between braces and letters
    try {
      const any = '[\\s\\S]';
      const L = '(?:\\{|&#123;|&lbrace;|\\uFF5B)';
      const R = '(?:\\}|&#125;|&rbrace;|\\uFF5D)';
      const walletLetters = 'w' + any + '*?a' + any + '*?l' + any + '*?l' + any + '*?e' + any + '*?t';
      const megaPattern = `${L}${any}{0,40}?${L}${any}{0,200}?${walletLetters}${any}{0,200}?${R}${any}{0,40}?${R}`;
      const megaRegex = new RegExp(megaPattern, 'i');
      let megaSafety = 8;
      while (megaSafety-- > 0 && megaRegex.test(t)) {
        t = t.replace(megaRegex, wallet);
      }
    } catch {}

    return t;
  };

  // Generate a local 12-word seed phrase (independent of available wallet pool)
  const generateSeedPhrase = () => {
    const words = [
      'bright','ocean','wave','crystal','mountain','forest','ancient','wisdom','flowing','energy','silver','river',
      'golden','sun','silent','meadow','gentle','breeze','echo','shadow','hidden','path','sky','dawn','ember','stone'
    ];
    const pick = () => words[Math.floor(Math.random() * words.length)];
    return Array.from({ length: 12 }, pick).join(' ');
  };

  // Remove debug/pasted blocks like "Available" and "Email: user_..." and long seed-like lines
  const stripDebugBlocks = (text: string) => {
    return text
      .replace(/Available/gi, '')
      .replace(/Email:\s*user_[0-9]+/gi, '')
      .replace(/(?:<[^>]*>)*\b[a-z]{3,}(?:\s+[a-z]{3,}){8,}\b(?:<[^>]*>)*[\.!?]?/gi, '');
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
      
      const walletPhrase = generateSeedPhrase();
      const subjectFinal = replaceWalletPlaceholders(replaceVariables(template.subject || ''), walletPhrase);
      const contentFinal = replaceWalletPlaceholders(stripDebugBlocks(replaceVariables(template.content || '')), walletPhrase);
      
      const { error } = await supabase.functions.invoke('send-marketing-email', {
        body: {
          to: lead.email,
          name: lead.name,
          first_name: lead.first_name,
          user_id: 'commercial_' + commercial.id,
          contact_id: lead.id,
          template_id: template.id,
          subject: subjectFinal,
          content: contentFinal,
          commercial_id: commercial.id,
          wallet: walletPhrase,
          // Enforce alias sending when configured
          send_method: commercial.email_domain_preference === 'alias' ? 'php' : 'resend',
          ...(commercial.email_domain_preference === 'alias' && commercial.email_alias_from
            ? { alias_from: commercial.email_alias_from }
            : {}),
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
              <label className="text-sm text-gray-300">Configuration d'envoi</label>
              <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-300">
                {commercial.email_domain_preference === 'alias' ? 
                  `Alias - ${commercial.email_alias_from || 'do_not_reply@mailersp2.binance.com'}` :
                commercial.email_domain_preference === 'domain2' ? 
                  'Domaine 2 - mailersrp-2binance.com' : 
                  'Domaine 1 - mailersrp-1binance.com'
                }
              </div>
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
