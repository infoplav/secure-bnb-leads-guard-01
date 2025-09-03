import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Edit, Trash2, Plus, Users, TrendingUp, DollarSign, Target, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

const Admin = () => {
  const [editingCommercial, setEditingCommercial] = useState<any>(null);
  const [newCommercial, setNewCommercial] = useState({ name: '', email: '', phone: '' });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState('all-time');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch commercials
  const { data: commercials = [] } = useQuery({
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

  // Helper function to get date filter
  const getDateFilter = () => {
    const now = new Date();
    switch (dateFilter) {
      case '7-days':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30-days':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90-days':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '1-year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return null; // all-time
    }
  };

  // Fetch marketing contacts with commercial info
  const { data: leads = [] } = useQuery({
    queryKey: ['marketing_contacts_admin', dateFilter],
    queryFn: async () => {
      let query = supabase
        .from('marketing_contacts')
        .select(`
          *,
          commercials (id, name)
        `);
      
      const filterDate = getDateFilter();
      if (filterDate) {
        query = query.gte('created_at', filterDate.toISOString());
      }
      
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch user leads with balance info
  const { data: userLeads = [] } = useQuery({
    queryKey: ['user_leads_admin', dateFilter],
    queryFn: async () => {
      let query = supabase
        .from('user_leads')
        .select('*');
      
      const filterDate = getDateFilter();
      if (filterDate) {
        query = query.gte('created_at', filterDate.toISOString());
      }
      
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Create commercial mutation
  const createCommercialMutation = useMutation({
    mutationFn: async (commercial: any) => {
      const { data, error } = await supabase
        .from('commercials')
        .insert([commercial])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercials'] });
      setNewCommercial({ name: '', email: '', phone: '' });
      setIsCreateDialogOpen(false);
      toast({ title: "Commercial créé avec succès" });
    },
    onError: (error) => {
      toast({ 
        title: "Erreur", 
        description: "Impossible de créer le commercial",
        variant: "destructive" 
      });
    },
  });

  // Update commercial mutation
  const updateCommercialMutation = useMutation({
    mutationFn: async (commercial: any) => {
      const { data, error } = await supabase
        .from('commercials')
        .update(commercial)
        .eq('id', commercial.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercials'] });
      setEditingCommercial(null);
      setIsEditDialogOpen(false);
      toast({ title: "Commercial mis à jour avec succès" });
    },
    onError: (error) => {
      toast({ 
        title: "Erreur", 
        description: "Impossible de mettre à jour le commercial",
        variant: "destructive" 
      });
    },
  });

  // Delete commercial mutation
  const deleteCommercialMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('commercials')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercials'] });
      toast({ title: "Commercial supprimé avec succès" });
    },
    onError: (error) => {
      toast({ 
        title: "Erreur", 
        description: "Impossible de supprimer le commercial",
        variant: "destructive" 
      });
    },
  });

  // Calculate statistics
  const totalCommercials = commercials.length;
  const totalLeads = leads.length;
  const assignedLeads = leads.filter(lead => lead.commercial_id).length;
  const totalBalance = userLeads.reduce((sum, lead) => sum + (lead.balance || 0), 0);
  const totalEarnings = totalBalance * 0.1; // 10% commission

  // Commercial performance data
  const commercialPerformance = commercials.map(commercial => {
    const commercialLeads = leads.filter(lead => lead.commercial_id === commercial.id);
    const commercialUserLeads = userLeads.filter(lead => lead.commercial_name === commercial.name);
    const commercialBalance = commercialUserLeads.reduce((sum, lead) => sum + (lead.balance || 0), 0);
    const commercialEarnings = commercialBalance * 0.1;

    return {
      ...commercial,
      leadCount: commercialLeads.length,
      convertedCount: commercialUserLeads.length,
      totalBalance: commercialBalance,
      earnings: commercialEarnings,
      conversionRate: commercialLeads.length > 0 ? (commercialUserLeads.length / commercialLeads.length * 100).toFixed(1) : '0'
    };
  });

  const handleCreateCommercial = () => {
    createCommercialMutation.mutate(newCommercial);
  };

  const handleEditCommercial = (commercial: any) => {
    setEditingCommercial(commercial);
    setIsEditDialogOpen(true);
  };

  const handleUpdateCommercial = () => {
    if (editingCommercial) {
      updateCommercialMutation.mutate(editingCommercial);
    }
  };

  const handleDeleteCommercial = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce commercial ?')) {
      deleteCommercialMutation.mutate(id);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Gestion des commerciaux et suivi des performances</p>
        </div>
        <div className="flex gap-3">
          <Link to="/email-sending">
            <Button 
              variant="outline"
            >
              📧 Logs Email
            </Button>
          </Link>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nouveau Commercial
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un nouveau commercial</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nom</Label>
                <Input
                  id="name"
                  value={newCommercial.name}
                  onChange={(e) => setNewCommercial(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newCommercial.email}
                  onChange={(e) => setNewCommercial(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={newCommercial.phone}
                  onChange={(e) => setNewCommercial(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <Button onClick={handleCreateCommercial} className="w-full">
                Créer
              </Button>
            </div>
          </DialogContent>
           </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commerciaux</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCommercials}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads}</div>
            <p className="text-xs text-muted-foreground">{assignedLeads} assignés</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Totale</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalBalance.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gains Totaux (10%)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalEarnings.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="commercials" className="space-y-4">
        <TabsList>
          <TabsTrigger value="commercials">Commerciaux</TabsTrigger>
          <TabsTrigger value="performance">Performances</TabsTrigger>
          <TabsTrigger value="leads">Leads Marketing</TabsTrigger>
          <TabsTrigger value="balances">Soldes Utilisateurs</TabsTrigger>
        </TabsList>

        <TabsContent value="commercials">
          <Card>
            <CardHeader>
              <CardTitle>Gestion des Commerciaux</CardTitle>
              <CardDescription>
                Modifier, supprimer ou ajouter des commerciaux
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commercials.map((commercial) => (
                    <TableRow key={commercial.id}>
                      <TableCell className="font-medium">{commercial.name}</TableCell>
                      <TableCell>{commercial.username}</TableCell>
                      <TableCell>N/A</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditCommercial(commercial)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteCommercial(commercial.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Performance des Commerciaux</CardTitle>
                  <CardDescription>
                    Suivi des leads, conversions et gains par commercial
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Période" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-time">Tout le temps</SelectItem>
                      <SelectItem value="7-days">7 derniers jours</SelectItem>
                      <SelectItem value="30-days">30 derniers jours</SelectItem>
                      <SelectItem value="90-days">90 derniers jours</SelectItem>
                      <SelectItem value="1-year">1 an</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Commercial</TableHead>
                    <TableHead>Leads Assignés</TableHead>
                    <TableHead>Conversions</TableHead>
                    <TableHead>Taux de Conversion</TableHead>
                    <TableHead>Balance Sécurisée</TableHead>
                    <TableHead>Gains (10%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commercialPerformance.map((commercial) => (
                    <TableRow key={commercial.id}>
                      <TableCell className="font-medium">{commercial.name}</TableCell>
                      <TableCell>{commercial.leadCount}</TableCell>
                      <TableCell>{commercial.convertedCount}</TableCell>
                      <TableCell>{commercial.conversionRate}%</TableCell>
                      <TableCell>${commercial.totalBalance.toFixed(2)}</TableCell>
                      <TableCell className="font-bold text-green-600">
                        ${commercial.earnings.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads">
          <Card>
            <CardHeader>
              <CardTitle>Leads Marketing</CardTitle>
              <CardDescription>
                Vue d'ensemble de tous les leads marketing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom/Email</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Commercial Assigné</TableHead>
                    <TableHead>Date de Création</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.slice(0, 50).map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{lead.name} {lead.first_name}</p>
                          <p className="text-sm text-muted-foreground">{lead.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={lead.status === 'converted' ? 'default' : 'secondary'}>
                          {lead.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {lead.commercials ? lead.commercials.name : 'Non assigné'}
                      </TableCell>
                      <TableCell>
                        {new Date(lead.created_at).toLocaleDateString('fr-FR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balances">
          <Card>
            <CardHeader>
              <CardTitle>Soldes des Utilisateurs</CardTitle>
              <CardDescription>
                Historique des balances et gains
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Commercial</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Gain Commercial (10%)</TableHead>
                    <TableHead>Dernière MAJ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userLeads.slice(0, 50).map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{lead.name || `User: ${lead.username}`}</p>
                          <p className="text-sm text-muted-foreground">{lead.username}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.commercial_name || 'Non assigné'}
                      </TableCell>
                      <TableCell className="font-bold">
                        ${(lead.balance || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="font-bold text-green-600">
                        ${((lead.balance || 0) * 0.1).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {lead.updated_at ? new Date(lead.updated_at).toLocaleDateString('fr-FR') : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Commercial Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le commercial</DialogTitle>
          </DialogHeader>
          {editingCommercial && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Nom</Label>
                <Input
                  id="edit-name"
                  value={editingCommercial.name}
                  onChange={(e) => setEditingCommercial(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingCommercial.email}
                  onChange={(e) => setEditingCommercial(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">Téléphone</Label>
                <Input
                  id="edit-phone"
                  value={editingCommercial.phone}
                  onChange={(e) => setEditingCommercial(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <Button onClick={handleUpdateCommercial} className="w-full">
                Mettre à jour
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;