import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Mail, Send, User, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface EmailSenderProps {
  commercial?: any;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
}

const EmailSender = ({ commercial }: EmailSenderProps) => {
  const [recipients, setRecipients] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [customVariables, setCustomVariables] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('domain1');
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  
  const queryClient = useQueryClient();

  // Available template variables
  const availableVariables = [
    '{{name}}', '{{first_name}}', '{{email}}', '{{commercial_name}}',
    '{{wallet}}', '{{current_ip}}', '{{current_time_minus_10}}', 
    '{{link}}', '{{home_link}}'
  ];

  // Fetch email templates
  const { data: templates = [] } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as EmailTemplate[];
    }
  });

  // Fetch commercials for selection
  const { data: commercials = [] } = useQuery({
    queryKey: ['commercials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commercials')
        .select('id, name, email_domain_preference')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  // Single email send mutation
  const sendSingleEmailMutation = useMutation({
    mutationFn: async ({ email, template, variables, commercial_id, domain }: {
      email: string;
      template: EmailTemplate;
      variables: Record<string, string>;
      commercial_id: string;
      domain: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('send-marketing-email', {
        body: {
          to: email.trim(),
          template_id: template.id,
          commercial_id,
          domain,
          variables,
          name: variables.name || email.split('@')[0],
          first_name: variables.first_name || variables.name || email.split('@')[0]
        }
      });

      if (error) throw error;
      return data;
    }
  });

  // Bulk email send mutation
  const sendBulkEmailMutation = useMutation({
    mutationFn: async ({ emails, template, variables, commercial_id, domain }: {
      emails: string[];
      template: EmailTemplate;
      variables: Record<string, string>;
      commercial_id: string;
      domain: string;
    }) => {
      setIsBulkSending(true);
      setSendProgress(0);
      
      const results = [];
      const totalEmails = emails.length;
      
      for (let i = 0; i < emails.length; i++) {
        const email = emails[i];
        try {
          await sendSingleEmailMutation.mutateAsync({
            email,
            template,
            variables,
            commercial_id,
            domain
          });
          
          results.push({ email, success: true });
          setSendProgress(Math.round(((i + 1) / totalEmails) * 100));
          
          // Rate limiting - wait 1 second between emails
          if (i < emails.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error: any) {
          results.push({ email, success: false, error: error.message });
          setSendProgress(Math.round(((i + 1) / totalEmails) * 100));
        }
      }
      
      return results;
    },
    onSuccess: (results) => {
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      toast.success(`Bulk send completed: ${successful} sent, ${failed} failed`);
      setIsBulkSending(false);
      setSendProgress(0);
      queryClient.invalidateQueries({ queryKey: ['email-logs'] });
    },
    onError: (error: any) => {
      toast.error(`Bulk send failed: ${error.message}`);
      setIsBulkSending(false);
      setSendProgress(0);
    }
  });

  const parseCustomVariables = (): Record<string, string> => {
    if (!customVariables.trim()) return {};
    
    try {
      const variables: Record<string, string> = {};
      customVariables.split('\n').forEach(line => {
        const [key, value] = line.split(':').map(s => s.trim());
        if (key && value) {
          variables[key] = value;
        }
      });
      return variables;
    } catch {
      return {};
    }
  };

  const parseRecipients = (): string[] => {
    return recipients
      .split(/[,\n]/)
      .map(email => email.trim())
      .filter(email => email.includes('@'));
  };

  const handleSend = () => {
    const emailList = parseRecipients();
    const template = templates.find(t => t.id === selectedTemplate);
    
    if (!template) {
      toast.error('Please select a template');
      return;
    }
    
    if (emailList.length === 0) {
      toast.error('Please enter at least one valid email address');
      return;
    }

    const variables = parseCustomVariables();
    const targetCommercial = commercial?.id || commercials[0]?.id;
    
    if (!targetCommercial) {
      toast.error('No commercial selected');
      return;
    }

    if (emailList.length === 1) {
      // Single email
      sendSingleEmailMutation.mutate({
        email: emailList[0],
        template,
        variables,
        commercial_id: targetCommercial,
        domain: selectedDomain
      });
    } else {
      // Bulk email
      sendBulkEmailMutation.mutate({
        emails: emailList,
        template,
        variables,
        commercial_id: targetCommercial,
        domain: selectedDomain
      });
    }
  };

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Mail className="w-8 h-8 text-primary" />
            Email Campaign Sender
          </h1>
          <p className="text-muted-foreground">Send personalized emails using your templates</p>
        </div>

        {/* Email Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Email Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Email Template</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} - {template.subject.substring(0, 40)}...
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Sending Domain</Label>
                <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="domain1">Domain 1 (mailersrp-1binance.com)</SelectItem>
                    <SelectItem value="domain2">Domain 2 (mailersrp-2binance.com)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedTemplateData && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Selected Template Preview:</h4>
                <p className="text-sm"><strong>Subject:</strong> {selectedTemplateData.subject}</p>
                <p className="text-sm mt-1"><strong>Variables used:</strong> {
                  availableVariables
                    .filter(v => selectedTemplateData.content.includes(v))
                    .join(', ') || 'None'
                }</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recipients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Recipients
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="recipients">Email Addresses (one per line or comma-separated)</Label>
              <Textarea
                id="recipients"
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                placeholder="john.doe@example.com&#10;jane.smith@example.com&#10;customer@domain.com"
                className="min-h-[120px]"
              />
              <p className="text-sm text-muted-foreground mt-1">
                {parseRecipients().length} valid email(s) detected
              </p>
            </div>

            <div>
              <Label htmlFor="custom-variables">Custom Variables (optional)</Label>
              <Textarea
                id="custom-variables"
                value={customVariables}
                onChange={(e) => setCustomVariables(e.target.value)}
                placeholder="name: John Doe&#10;company: Acme Corp&#10;special_offer: 50% discount"
                className="min-h-[80px]"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Format: key: value (one per line)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Send Controls */}
        <Card>
          <CardContent className="pt-6">
            {isBulkSending && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <Label>Sending Progress</Label>
                  <span className="text-sm text-muted-foreground">{sendProgress}%</span>
                </div>
                <Progress value={sendProgress} className="w-full" />
              </div>
            )}
            
            <div className="flex gap-4">
              <Button
                onClick={handleSend}
                disabled={!selectedTemplate || parseRecipients().length === 0 || sendSingleEmailMutation.isPending || sendBulkEmailMutation.isPending}
                className="flex-1"
              >
                <Send className="w-4 h-4 mr-2" />
                {isBulkSending ? 'Sending...' : `Send to ${parseRecipients().length} recipient${parseRecipients().length !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Status Information */}
        {(sendSingleEmailMutation.isPending || sendBulkEmailMutation.isPending || isBulkSending) && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 text-primary">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span>Sending emails...</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Please wait while emails are being sent. Rate limiting is applied for better deliverability.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default EmailSender;