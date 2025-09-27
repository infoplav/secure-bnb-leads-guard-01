import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, FileText, BarChart3, Settings } from 'lucide-react';
import EmailTemplateManager from '@/components/EmailMarketing/EmailTemplateManager';
import EmailSender from '@/components/EmailMarketing/EmailSender';
import EmailAnalytics from '@/components/EmailMarketing/EmailAnalytics';
import CRMLogin from '@/components/CRM/CRMLogin';

const EmailMarketing = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <CRMLogin />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Mail className="w-10 h-10 text-primary" />
            Email Marketing Suite
          </h1>
          <p className="text-xl text-muted-foreground mt-2">
            Complete email marketing platform with templates, campaigns, and analytics
          </p>
        </div>

        <Tabs defaultValue="sender" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sender" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Send Campaigns
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Manage Templates
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics & Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sender" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Email Campaign Sender
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EmailSender />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <EmailTemplateManager />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <EmailAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EmailMarketing;