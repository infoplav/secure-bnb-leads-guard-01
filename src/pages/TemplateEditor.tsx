
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Mail, MessageSquare } from 'lucide-react';
import TemplateList from '@/components/TemplateEditor/TemplateList';
import EmailTemplateEditor from '@/components/TemplateEditor/EmailTemplateEditor';
import SMSTemplateEditor from '@/components/TemplateEditor/SMSTemplateEditor';
import CRMLogin from '@/components/CRM/CRMLogin';

const TemplateEditor = () => {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'email' | 'sms'>('email');
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch email templates
  const { data: emailTemplates, isLoading: loadingEmail } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch SMS templates
  const { data: smsTemplates, isLoading: loadingSMS } = useQuery({
    queryKey: ['sms-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sms_templates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setIsCreating(true);
  };

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setIsCreating(true);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingTemplate(null);
  };

  const isLoading = loadingEmail || loadingSMS;

  if (!isAuthenticated) {
    return <CRMLogin />;
  }

  if (isCreating) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'email' ? (
            <EmailTemplateEditor
              template={editingTemplate}
              onCancel={handleCancel}
            />
          ) : (
            <SMSTemplateEditor
              template={editingTemplate}
              onCancel={handleCancel}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-yellow-400 mb-2">Template Editor</h1>
          <p className="text-gray-400">
            Create and manage email and SMS templates for marketing campaigns
          </p>
        </div>

        <div className="flex gap-4 mb-6">
          <Button
            variant={activeTab === 'email' ? 'default' : 'outline'}
            onClick={() => setActiveTab('email')}
            className="flex items-center gap-2"
          >
            <Mail className="h-4 w-4" />
            Email Templates
          </Button>
          <Button
            variant={activeTab === 'sms' ? 'default' : 'outline'}
            onClick={() => setActiveTab('sms')}
            className="flex items-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            SMS Templates
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-white">
                  {activeTab === 'email' ? (
                    <>
                      <Mail className="h-5 w-5" />
                      Email Templates ({emailTemplates?.length || 0})
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-5 w-5" />
                      SMS Templates ({smsTemplates?.length || 0})
                    </>
                  )}
                </CardTitle>
                <Button
                  onClick={handleCreateNew}
                  className="bg-yellow-600 hover:bg-yellow-700 text-black"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center text-gray-400 py-8">
                  Loading templates...
                </div>
              ) : (
                <TemplateList
                  templates={activeTab === 'email' ? emailTemplates || [] : smsTemplates || []}
                  type={activeTab}
                  onEdit={handleEdit}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TemplateEditor;
