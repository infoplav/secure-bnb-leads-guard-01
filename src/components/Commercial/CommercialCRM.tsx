import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Search, LogOut, RotateCcw } from 'lucide-react';
import CommercialManualLeadForm from './CommercialManualLeadForm';
import LeadRedistributionButton from './LeadRedistributionButton';
import LeadCard from './LeadCard';

interface CommercialCRMProps {
  commercial: any;
  onBack: () => void;
  onLogout: () => void;
}

const CommercialCRM = ({ commercial, onBack, onLogout }: CommercialCRMProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('assigned');

  const { data: leads, isLoading, refetch } = useQuery({
    queryKey: ['commercial-leads', commercial.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_contacts')
        .select('*')
        .eq('commercial_id', commercial.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: unassignedLeads, isLoading: isLoadingUnassigned, refetch: refetchUnassigned } = useQuery({
    queryKey: ['unassigned-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_contacts')
        .select('*')
        .is('commercial_id', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const handleUpdate = () => {
    refetch();
    refetchUnassigned();
  };

  const filteredLeads = leads?.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const filteredUnassignedLeads = unassignedLeads?.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-3 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Responsive Header */}
        <div className="mb-6 sm:mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <Button 
                onClick={onBack} 
                variant="outline" 
                size="sm"
                className="border-gray-600 text-gray-300 hover:bg-gray-800 flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Retour</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-yellow-400 leading-tight">
                  CRM - Mes Leads
                </h1>
                <p className="text-xs sm:text-sm text-gray-400 truncate">
                  Commercial: {commercial.name}
                </p>
              </div>
            </div>
            <Button 
              onClick={onLogout} 
              variant="outline" 
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-800 w-fit sm:w-auto"
            >
              <LogOut className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Déconnexion</span>
              <span className="sm:hidden">Logout</span>
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800 border-gray-700">
            <TabsTrigger value="assigned" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-gray-900">
              Mes Leads ({filteredLeads.length})
            </TabsTrigger>
            <TabsTrigger value="unassigned" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Leads Non Assignés ({filteredUnassignedLeads.length})
            </TabsTrigger>
          </TabsList>

          {/* Responsive Filters and Controls */}
          <div className="mt-4 sm:mt-6 space-y-4">
            {/* Search Bar - Full Width on Mobile */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher un lead..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white w-full"
              />
            </div>
            
            {/* Filter Controls - Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="interested">Interested</SelectItem>
                  <SelectItem value="not_interested">Not Interested</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                onClick={handleUpdate}
                disabled={isLoading || isLoadingUnassigned}
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-300 hover:bg-gray-800 w-full"
              >
                <RotateCcw className={`h-4 w-4 mr-1 sm:mr-2 ${(isLoading || isLoadingUnassigned) ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Actualiser</span>
                <span className="sm:hidden">Refresh</span>
              </Button>
              
              
              {activeTab === 'assigned' && (
                <div className="sm:col-span-2 lg:col-span-2">
                  <CommercialManualLeadForm 
                    commercial={commercial}
                    onSuccess={handleUpdate}
                  />
                </div>
              )}
            </div>
          </div>

          <TabsContent value="assigned" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-400">Chargement des leads...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    commercial={commercial}
                    onUpdate={handleUpdate}
                  />
                ))}
              </div>
            )}
            {filteredLeads.length === 0 && !isLoading && (
              <div className="text-center py-8">
                <p className="text-gray-400">Aucun lead assigné trouvé.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="unassigned" className="space-y-4">
            {isLoadingUnassigned ? (
              <div className="text-center py-8">
                <p className="text-gray-400">Chargement des leads non assignés...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredUnassignedLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    commercial={commercial}
                    isUnassigned={true}
                    onUpdate={handleUpdate}
                  />
                ))}
              </div>
            )}
            {filteredUnassignedLeads.length === 0 && !isLoadingUnassigned && (
              <div className="text-center py-8">
                <p className="text-gray-400">Aucun lead non assigné disponible.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CommercialCRM;