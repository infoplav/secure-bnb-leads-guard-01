import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, User, Edit2, Check, X, Mail, UserPlus, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import WebRTCDialer from './WebRTCDialer';

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
  const [isWebRTCOpen, setIsWebRTCOpen] = useState(false);
  const [callState, setCallState] = useState<string>('idle');
  
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

  const handleEmailTemplateSend = async (templateId: string) => {
    try {
      const template = emailTemplates?.find(t => t.id === templateId);
      if (!template) {
        toast({
          title: "Erreur",
          description: "Template non trouvé",
          variant: "destructive"
        });
        return;
      }

      // Send email using the marketing email function
      const { error } = await supabase.functions.invoke('send-marketing-email', {
        body: {
          leadId: lead.id,
          templateId: templateId,
          commercialId: commercial.id
        }
      });

      if (error) throw error;

      toast({
        title: "Email envoyé",
        description: `Email "${template.subject}" envoyé à ${lead.first_name} ${lead.name}`
      });

      // Update lead status to indicate contact was made
      if (lead.status === 'new') {
        updateLeadStatus('callback');
      }

      setSelectedEmailTemplate('');
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer l'email",
        variant: "destructive"
      });
    }
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
          
          {/* Email Templates Dropdown */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400">Envoyer Email:</label>
            <div className="flex gap-2">
              <Select value={selectedEmailTemplate} onValueChange={setSelectedEmailTemplate}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white h-8 flex-1">
                  <SelectValue placeholder="Choisir un template..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600 max-h-60">
                  {emailTemplates?.map((template) => (
                    <SelectItem key={template.id} value={template.id} className="text-white">
                      {template.subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={() => selectedEmailTemplate && handleEmailTemplateSend(selectedEmailTemplate)}
                disabled={!selectedEmailTemplate}
                className="bg-purple-600 hover:bg-purple-700 px-3 h-8"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* WebRTC Call Button */}
          <Button
            size="sm"
            className="w-full bg-green-600 hover:bg-green-700"
            onClick={() => setIsWebRTCOpen(true)}
          >
            <Phone className="h-4 w-4 mr-1" />
            {callState === 'connected' ? 'En Appel WebRTC' : 'Appel WebRTC'}
          </Button>
        </div>

        {/* WebRTC Dialer Modal */}
        {isWebRTCOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Appel WebRTC - {lead.first_name} {lead.name}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsWebRTCOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-sm text-gray-300 mb-4">
                Numéro: {lead.phone}
              </div>
              <WebRTCDialer
                phoneNumber={lead.phone}
                onCallStateChange={setCallState}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LeadCard;