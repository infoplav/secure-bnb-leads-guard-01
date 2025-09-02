import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Mail, MessageSquare, Users, Edit, Phone, PhoneOff, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import CRMLogin from '@/components/CRM/CRMLogin';
import ContactsList from '@/components/Marketing/ContactsList';
import CSVUpload from '@/components/Marketing/CSVUpload';
import LeadFilters from '@/components/Marketing/LeadFilters';
import BulkAssignByCount from '@/components/Marketing/BulkAssignByCount';
import ManualLeadForm from '@/components/Marketing/ManualLeadForm';

const Lead = () => {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [commercialFilter, setCommercialFilter] = useState('all');

  // Fetch marketing contacts with filters
  const { data: contacts, isLoading } = useQuery({
    queryKey: ['marketing-contacts', statusFilter, commercialFilter],
    queryFn: async () => {
      let query = supabase
        .from('marketing_contacts')
        .select(`
          *,
          commercials(name, username)
        `)
        .order('created_at', { ascending: false });

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply commercial filter
      if (commercialFilter !== 'all') {
        if (commercialFilter === 'unassigned') {
          query = query.is('commercial_id', null);
        } else {
          query = query.eq('commercial_id', commercialFilter);
        }
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });

  const handleUploadSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['marketing-contacts'] });
    toast({
      title: "Success",
      description: "CSV uploaded successfully!",
    });
  };

  // Calculate status-based statistics
  const getStatusStats = () => {
    if (!contacts) return { new: 0, callbacks: 0, interested: 0, converted: 0, unassigned: 0 };
    
    return {
      new: contacts.filter(c => c.status === 'new' || !c.status).length,
      callbacks: contacts.filter(c => c.status === 'callback').length,
      interested: contacts.filter(c => c.status === 'interested').length,
      converted: contacts.filter(c => c.status === 'converted').length,
      unassigned: contacts.filter(c => !c.commercial_id).length,
    };
  };

  const stats = getStatusStats();

  if (!isAuthenticated) {
    return <CRMLogin />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <Link to="/marketing">
                  <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-800">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Marketing
                  </Button>
                </Link>
                <h1 className="text-3xl font-bold text-yellow-400">Lead Management</h1>
              </div>
              <p className="text-gray-400">
                Upload CSV contacts, assign to commercials, and manage lead campaigns
              </p>
            </div>
            <Link to="/editor">
              <Button className="bg-yellow-600 hover:bg-yellow-700 text-black">
                <Edit className="h-4 w-4 mr-2" />
                Template Editor
              </Button>
            </Link>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="h-5 w-5" />
                Total Contacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">
                {contacts?.length || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Phone className="h-5 w-5" />
                New Contacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">
                {stats.new}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <PhoneOff className="h-5 w-5" />
                Callbacks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">
                {stats.callbacks}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <CheckCircle className="h-5 w-5" />
                Interested
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                {stats.interested}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <XCircle className="h-5 w-5" />
                Unassigned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">
                {stats.unassigned}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lead Management Tools */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <LeadFilters 
              statusFilter={statusFilter}
              commercialFilter={commercialFilter}
              onStatusChange={setStatusFilter}
              onCommercialChange={setCommercialFilter}
              onClearFilters={() => {
                setStatusFilter('all');
                setCommercialFilter('all');
              }}
            />
            <div className="flex gap-2">
              <ManualLeadForm onSuccess={handleUploadSuccess} />
              <BulkAssignByCount totalUnassignedLeads={stats.unassigned} />
            </div>
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <CSVUpload onUploadSuccess={handleUploadSuccess} />
            <ContactsList contacts={contacts || []} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lead;