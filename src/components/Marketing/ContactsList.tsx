import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail, MessageSquare, User, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import TemplateSelector from './TemplateSelector';
import ContactEditor from './ContactEditor';
import ContactStatus from './ContactStatus';
import BulkReassign from './BulkReassign';
import { blurEmail, blurPhoneNumber } from '@/utils/privacyUtils';

interface Contact {
  id: string;
  name: string;
  first_name: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
  commercial_id?: string;
  commercials?: {
    id?: string;
    name: string;
    username: string;
    hide_contact_info?: boolean;
  };
}

interface ContactsListProps {
  contacts: Contact[];
  isLoading: boolean;
}

const ContactsList = ({ contacts, isLoading }: ContactsListProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);

  const deleteContactsMutation = useMutation({
    mutationFn: async (contactIds: string[]) => {
      const chunkSize = 50;
      for (let i = 0; i < contactIds.length; i += chunkSize) {
        const chunk = contactIds.slice(i, i + chunkSize);
        const { error } = await supabase
          .from('marketing_contacts')
          .delete()
          .in('id', chunk);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-contacts'] });
      setSelectedContacts([]);
      toast({
        title: "Success",
        description: `${selectedContacts.length} contact(s) deleted successfully`,
      });
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: "Failed to delete contacts",
        variant: "destructive",
      });
    },
  });

  const sendTemplatedEmail = async (contact: Contact, template: any) => {
    try {
      const { error } = await supabase.functions.invoke('send-marketing-email', {
        body: {
          to: contact.email,
          name: contact.name,
          first_name: contact.first_name,
          user_id: contact.id,
          contact_id: contact.id,
          template_id: template.id,
          subject: template.subject,
          content: template.content,
          commercial_id: contact.commercial_id,
        },
      });

      if (error) throw error;

      toast({
        title: "Email sent!",
        description: `Template "${template.name}" sent to ${contact.email}`,
      });
    } catch (error) {
      console.error('Email error:', error);
      toast({
        title: "Email failed",
        description: "Failed to send email",
        variant: "destructive",
      });
    }
  };

  const sendTemplatedSMS = async (contact: Contact, template: any) => {
    try {
      const { error } = await supabase.functions.invoke('send-marketing-sms', {
        body: {
          to: contact.phone,
          message: template.content,
          name: contact.name,
          first_name: contact.first_name,
          user_id: contact.id,
          contact_id: contact.id,
          leadId: contact.id
        },
      });

      if (error) throw error;

      toast({
        title: "SMS sent!",
        description: `Template "${template.name}" sent to ${contact.phone}`,
      });
    } catch (error) {
      console.error('SMS error:', error);
      toast({
        title: "SMS failed",
        description: "Failed to send SMS",
        variant: "destructive",
      });
    }
  };

  const handleSelectAll = () => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(contacts.map(contact => contact.id));
    }
  };

  const handleSelectBulk = (count: number) => {
    const contactsToSelect = contacts.slice(0, Math.min(count, contacts.length));
    setSelectedContacts(contactsToSelect.map(contact => contact.id));
  };

  const handleSelectContact = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleDeleteSelected = () => {
    if (selectedContacts.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedContacts.length} contact(s)?`)) {
      deleteContactsMutation.mutate(selectedContacts);
    }
  };

  const handleDeleteSingle = (contactId: string) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      deleteContactsMutation.mutate([contactId]);
    }
  };

  const handleBulkReassignComplete = () => {
    setSelectedContacts([]);
  };

  if (isLoading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="text-center text-gray-400">Loading contacts...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Contacts ({contacts.length})
          </div>
           {contacts.length > 0 && (
             <div className="flex items-center gap-2">
               <Checkbox
                 checked={selectedContacts.length === contacts.length}
                 onCheckedChange={handleSelectAll}
                 className="border-gray-400"
               />
               <span className="text-sm text-gray-400">Select All</span>
               
               {/* Bulk selection buttons */}
               <div className="flex gap-1 ml-2">
                 {[50, 100, 500].map((count) => (
                   <Button
                     key={count}
                     size="sm"
                     variant="outline"
                     onClick={() => handleSelectBulk(count)}
                     disabled={contacts.length === 0}
                     className="h-6 px-2 text-xs border-gray-600 text-gray-300 hover:bg-gray-600"
                   >
                     {Math.min(count, contacts.length)}
                   </Button>
                 ))}
               </div>
               
               {selectedContacts.length > 0 && (
                 <div className="flex gap-2">
                   <BulkReassign 
                     selectedContacts={selectedContacts}
                     onComplete={handleBulkReassignComplete}
                   />
                   <Button
                     size="sm"
                     variant="destructive"
                     onClick={handleDeleteSelected}
                     disabled={deleteContactsMutation.isPending}
                   >
                     <Trash2 className="h-4 w-4 mr-1" />
                     Delete ({selectedContacts.length})
                   </Button>
                 </div>
               )}
             </div>
           )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {contacts.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No contacts uploaded yet. Upload a CSV file to get started.
            </div>
          ) : (
            contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center gap-3 p-4 bg-gray-700 rounded-lg"
              >
                <Checkbox
                  checked={selectedContacts.includes(contact.id)}
                  onCheckedChange={() => handleSelectContact(contact.id)}
                  className="border-gray-400"
                />
                <div className="flex-1">
                  <div className="font-medium text-white mb-1">
                    {contact.first_name} {contact.name}
                  </div>
                  <div className="text-sm text-gray-400 mb-1">
                    {contact.commercials?.hide_contact_info ? blurEmail(contact.email) : contact.email}
                  </div>
                  <div className="text-sm text-gray-400 mb-2">
                    {contact.commercials?.hide_contact_info ? blurPhoneNumber(contact.phone) : contact.phone}
                  </div>
                  <ContactStatus contact={contact} />
                  {contact.commercials && (
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs border-gray-500 text-gray-300">
                        {contact.commercials.name}
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <ContactEditor contact={contact} />
                    
                    <TemplateSelector
                      type="email"
                      onSelectTemplate={(template) => sendTemplatedEmail(contact, template)}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:bg-gray-600"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    </TemplateSelector>
                    
                    <TemplateSelector
                      type="sms"
                      onSelectTemplate={(template) => sendTemplatedSMS(contact, template)}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:bg-gray-600"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </TemplateSelector>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteSingle(contact.id)}
                    disabled={deleteContactsMutation.isPending}
                    className="border-red-600 bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ContactsList;
