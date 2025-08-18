import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, TrendingUp, Target, Search } from 'lucide-react';

const Dashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [commercialFilter, setCommercialFilter] = useState('all');

  // Fetch all commercials
  const { data: commercials } = useQuery({
    queryKey: ['commercials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commercials')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch all leads with commercial info
  const { data: leads, isLoading } = useQuery({
    queryKey: ['dashboard-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_contacts')
        .select(`
          *,
          commercials (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Calculate statistics
  const totalLeads = leads?.length || 0;
  const assignedLeads = leads?.filter(lead => lead.commercial_id).length || 0;
  const unassignedLeads = totalLeads - assignedLeads;
  const convertedLeads = leads?.filter(lead => lead.status === 'converted').length || 0;

  // Group leads by commercial
  const leadsByCommercial = commercials?.map(commercial => ({
    ...commercial,
    totalLeads: leads?.filter(lead => lead.commercial_id === commercial.id).length || 0,
    newLeads: leads?.filter(lead => lead.commercial_id === commercial.id && lead.status === 'new').length || 0,
    interestedLeads: leads?.filter(lead => lead.commercial_id === commercial.id && lead.status === 'interested').length || 0,
    convertedLeads: leads?.filter(lead => lead.commercial_id === commercial.id && lead.status === 'converted').length || 0,
  })) || [];

  // Filter leads for detailed view
  const filteredLeads = leads?.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesCommercial = commercialFilter === 'all' || 
      (commercialFilter === 'unassigned' ? !lead.commercial_id : lead.commercial_id === commercialFilter);
    
    return matchesSearch && matchesStatus && matchesCommercial;
  }) || [];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800',
      interested: 'bg-green-100 text-green-800',
      not_interested: 'bg-red-100 text-red-800',
      converted: 'bg-purple-100 text-purple-800',
      callback: 'bg-yellow-100 text-yellow-800',
      not_answering_1: 'bg-orange-100 text-orange-800',
      not_answering_2: 'bg-orange-100 text-orange-800',
      not_answering_3: 'bg-orange-100 text-orange-800',
      wrong_number: 'bg-gray-100 text-gray-800',
      do_not_call: 'bg-red-200 text-red-900',
    };
    
    return (
      <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>
        {status?.replace(/_/g, ' ').toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Commercial</h1>
          <p className="text-gray-600">Vue d'ensemble de tous les leads et performances des commerciaux</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLeads}</div>
              <p className="text-xs text-muted-foreground">
                {assignedLeads} assignés, {unassignedLeads} non assignés
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taux d'Attribution</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalLeads > 0 ? Math.round((assignedLeads / totalLeads) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Leads assignés aux commerciaux
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{convertedLeads}</div>
              <p className="text-xs text-muted-foreground">
                {totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0}% du total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commerciaux Actifs</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{commercials?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Équipe commerciale
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="commercials" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="commercials">Performance Commerciaux</TabsTrigger>
            <TabsTrigger value="leads">Détail des Leads</TabsTrigger>
          </TabsList>

          <TabsContent value="commercials" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance par Commercial</CardTitle>
                <CardDescription>
                  Vue d'ensemble des leads par commercial et leurs statuts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Commercial</TableHead>
                      <TableHead className="text-center">Total Leads</TableHead>
                      <TableHead className="text-center">Nouveaux</TableHead>
                      <TableHead className="text-center">Intéressés</TableHead>
                      <TableHead className="text-center">Convertis</TableHead>
                      <TableHead className="text-center">Taux Conversion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leadsByCommercial.map((commercial) => (
                      <TableRow key={commercial.id}>
                        <TableCell className="font-medium">{commercial.name}</TableCell>
                        <TableCell className="text-center">{commercial.totalLeads}</TableCell>
                        <TableCell className="text-center">{commercial.newLeads}</TableCell>
                        <TableCell className="text-center">{commercial.interestedLeads}</TableCell>
                        <TableCell className="text-center">{commercial.convertedLeads}</TableCell>
                        <TableCell className="text-center">
                          {commercial.totalLeads > 0 
                            ? `${((commercial.convertedLeads / commercial.totalLeads) * 100).toFixed(1)}%`
                            : '0%'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leads" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tous les Leads</CardTitle>
                <CardDescription>
                  Liste complète de tous les leads avec filtres
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Rechercher un lead..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filtrer par statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="interested">Interested</SelectItem>
                      <SelectItem value="not_interested">Not Interested</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                      <SelectItem value="callback">Callback</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={commercialFilter} onValueChange={setCommercialFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filtrer par commercial" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les commerciaux</SelectItem>
                      <SelectItem value="unassigned">Non assignés</SelectItem>
                      {commercials?.map(commercial => (
                        <SelectItem key={commercial.id} value={commercial.id}>
                          {commercial.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Téléphone</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Commercial</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            Chargement...
                          </TableCell>
                        </TableRow>
                      ) : filteredLeads.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            Aucun lead trouvé
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredLeads.map((lead) => (
                          <TableRow key={lead.id}>
                            <TableCell className="font-medium">
                              {lead.first_name} {lead.name}
                            </TableCell>
                            <TableCell>{lead.email}</TableCell>
                            <TableCell>{lead.phone}</TableCell>
                            <TableCell>
                              {lead.source && (
                                <Badge variant="outline">{lead.source}</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {lead.commercials?.name || (
                                <Badge variant="secondary">Non assigné</Badge>
                              )}
                            </TableCell>
                            <TableCell>{getStatusBadge(lead.status || 'new')}</TableCell>
                            <TableCell>
                              {new Date(lead.created_at || '').toLocaleDateString('fr-FR')}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;