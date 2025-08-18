import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, User, MessageSquare, PhoneCall, Edit2, Check, X, Mail, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  onTemplatesOpen: (lead: Lead) => void;
  onCallScriptOpen?: (lead: Lead) => void;
  onUpdate: () => void;
}

const LeadCard = ({ lead, commercial, isUnassigned = false, onTemplatesOpen, onCallScriptOpen, onUpdate }: LeadCardProps) => {
  const { toast } = useToast();
  const [editingEmail, setEditingEmail] = useState(false);
  const [editEmailValue, setEditEmailValue] = useState(lead.email);

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
          
          {onCallScriptOpen ? (
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                onClick={() => onCallScriptOpen(lead)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <PhoneCall className="h-4 w-4 mr-1" />
                Script
              </Button>
              <Button
                size="sm"
                onClick={() => onTemplatesOpen(lead)}
                variant="outline"
                className="border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white"
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                Templates
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={() => onTemplatesOpen(lead)}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              Templates
            </Button>
          )}

          
          <Button
            size="sm"
            className="w-full bg-green-600 hover:bg-green-700"
            onClick={() => window.open(`tel:${lead.phone}`)}
          >
            <Phone className="h-4 w-4 mr-1" />
            Appel Direct
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeadCard;