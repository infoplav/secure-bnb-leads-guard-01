import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Mail, Send } from 'lucide-react';
import { toast } from 'sonner';

interface QuickEmailSenderProps {
  lead?: any;
  commercial?: any;
  trigger?: React.ReactNode;
  onEmailSent?: () => void;
}

const QuickEmailSender = ({ lead, commercial, trigger, onEmailSent }: QuickEmailSenderProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [recipientEmail, setRecipientEmail] = useState(lead?.email || '');
  const [recipientName, setRecipientName] = useState(lead?.name || lead?.first_name || '');

  // Fetch email templates
  const { data: templates = [] } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate || !recipientEmail) {
        throw new Error('Please select a template and enter recipient email');
      }

      const template = templates.find(t => t.id === selectedTemplate);
      if (!template) {
        throw new Error('Template not found');
      }

      const { data, error } = await supabase.functions.invoke('send-marketing-email', {
        body: {
          to: recipientEmail,
          name: recipientName,
          first_name: recipientName,
          template_id: selectedTemplate,
          commercial_id: commercial?.id || lead?.commercial_id,
          contact_id: lead?.id,
          domain: commercial?.email_domain_preference || 'domain1'
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Email sent successfully to ${recipientEmail}`);
        setIsOpen(false);
        onEmailSent?.();
      } else {
        throw new Error(data.error || 'Email sending failed');
      }
    },
    onError: (error: any) => {
      toast.error(`Failed to send email: ${error.message}`);
    }
  });

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Mail className="w-4 h-4 mr-2" />
            Send Email
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Quick Email Sender
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Recipient Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Recipient Email</Label>
              <Input
                id="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="recipient@example.com"
              />
            </div>
            <div>
              <Label htmlFor="name">Recipient Name</Label>
              <Input
                id="name"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Recipient Name"
              />
            </div>
          </div>

          {/* Template Selection */}
          <div>
            <Label>Email Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Select an email template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div>
                      <p className="font-medium">{template.name}</p>
                      <p className="text-sm text-muted-foreground">{template.subject}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Template Preview */}
          {selectedTemplateData && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{selectedTemplateData.name}</Badge>
              </div>
              <p className="text-sm"><strong>Subject:</strong> {selectedTemplateData.subject}</p>
              <div className="mt-2 text-xs text-muted-foreground">
                <p><strong>Variables used:</strong></p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {['{{name}}', '{{first_name}}', '{{email}}', '{{commercial_name}}', '{{wallet}}', '{{link}}']
                    .filter(variable => selectedTemplateData.content.includes(variable))
                    .map(variable => (
                      <Badge key={variable} variant="secondary" className="text-xs">
                        {variable.replace(/[{}]/g, '')}
                      </Badge>
                    ))
                  }
                </div>
              </div>
            </div>
          )}

          {/* Commercial Info */}
          {commercial && (
            <div className="p-3 bg-primary/10 rounded-lg">
              <p className="text-sm">
                <strong>Commercial:</strong> {commercial.name} 
                <span className="text-muted-foreground ml-2">
                  ({commercial.email_domain_preference === 'domain2' ? 'Domain 2' : 'Domain 1'})
                </span>
              </p>
            </div>
          )}

          {/* Send Button */}
          <div className="flex gap-4 pt-4">
            <Button
              onClick={() => sendEmailMutation.mutate()}
              disabled={!selectedTemplate || !recipientEmail || sendEmailMutation.isPending}
              className="flex-1"
            >
              <Send className="w-4 h-4 mr-2" />
              {sendEmailMutation.isPending ? 'Sending...' : 'Send Email'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickEmailSender;