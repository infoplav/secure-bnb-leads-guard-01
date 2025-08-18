
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface Contact {
  id: string;
  name: string;
  first_name: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
  commercials?: {
    name: string;
    username: string;
  };
}

interface ContactStatusProps {
  contact: Contact;
}

const statusOptions = [
  { value: 'new', label: 'New', color: 'bg-blue-500' },
  { value: 'not_answering_1', label: 'Not Answering (1x)', color: 'bg-yellow-500' },
  { value: 'not_answering_2', label: 'Not Answering (2x)', color: 'bg-orange-500' },
  { value: 'not_answering_3', label: 'Not Answering (3x+)', color: 'bg-red-500' },
  { value: 'callback', label: 'To Call Back', color: 'bg-purple-500' },
  { value: 'wrong_number', label: 'Wrong Number', color: 'bg-gray-500' },
  { value: 'interested', label: 'Interested', color: 'bg-green-500' },
  { value: 'not_interested', label: 'Not Interested', color: 'bg-red-600' },
  { value: 'converted', label: 'Converted', color: 'bg-emerald-600' },
  { value: 'do_not_call', label: 'Do Not Call', color: 'bg-black' },
];

const ContactStatus = ({ contact }: ContactStatusProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from('marketing_contacts')
        .update({ status: newStatus })
        .eq('id', contact.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-contacts'] });
      toast({
        title: "Status updated",
        description: "Contact status has been updated successfully",
      });
    },
    onError: (error) => {
      console.error('Status update error:', error);
      toast({
        title: "Error",
        description: "Failed to update contact status",
        variant: "destructive",
      });
    },
  });

  const currentStatus = statusOptions.find(option => option.value === contact.status) || statusOptions[0];

  const handleStatusChange = (newStatus: string) => {
    updateStatusMutation.mutate(newStatus);
  };

  return (
    <div className="flex items-center gap-2">
      <Badge className={`${currentStatus.color} text-white text-xs`}>
        {currentStatus.label}
      </Badge>
      <Select value={contact.status || 'new'} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-40 h-8 bg-gray-700 border-gray-600 text-white text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-gray-700">
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-white hover:bg-gray-700">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${option.color}`}></div>
                {option.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ContactStatus;
