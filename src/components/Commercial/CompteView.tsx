import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Search, LogOut, DollarSign, Calendar, User, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface CompteViewProps {
  commercial: any;
  onBack: () => void;
  onLogout: () => void;
}

const CompteView = ({ commercial, onBack, onLogout }: CompteViewProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const updateLanguage = async (newLanguage: string) => {
    try {
      const { error } = await supabase
        .from('commercials')
        .update({ language: newLanguage })
        .eq('id', commercial.id);

      if (error) throw error;

      // Update local commercial object
      commercial.language = newLanguage;

      toast({
        title: "Langue mise à jour",
        description: `La langue a été changée en ${newLanguage === 'fr' ? 'Français' : 'English'}. Rafraîchissez la page pour voir les changements.`,
      });
    } catch (error) {
      console.error('Error updating language:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la langue",
        variant: "destructive"
      });
    }
  };

  // Fetch user_leads with commercial_name matching this commercial
  const { data: userLeads, isLoading } = useQuery({
    queryKey: ['user-leads-compte', commercial.id, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('user_leads')
        .select('*')
        .eq('commercial_name', commercial.name)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`username.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Calculate total balance
  const totalBalance = userLeads?.reduce((sum, lead) => sum + (lead.balance || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          {/* Mobile: Stack vertically */}
          <div className="flex flex-col gap-4 md:hidden">
            <div className="flex items-center justify-between">
              <Button 
                onClick={onBack}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <Button 
                onClick={onLogout}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
                size="sm"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Déconnexion
              </Button>
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-yellow-400">Compte - Balances</h1>
              <p className="text-gray-400 text-sm">Commercial: {commercial.name}</p>
            </div>
          </div>
          
          {/* Desktop: Horizontal layout */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                onClick={onBack}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-yellow-400">Compte - Balances</h1>
                <p className="text-gray-400">Commercial: {commercial.name}</p>
              </div>
            </div>
            <Button 
              onClick={onLogout}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>

        {/* Summary Card */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <DollarSign className="h-5 w-5 text-green-500" />
              Résumé des Balances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  ${totalBalance.toFixed(2)}
                </div>
                <div className="text-sm text-gray-400">Balance Totale</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {userLeads?.length || 0}
                </div>
                <div className="text-sm text-gray-400">Total Leads</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {userLeads?.filter(lead => (lead.balance || 0) > 0).length || 0}
                </div>
                <div className="text-sm text-gray-400">Leads avec Balance</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Language Settings Card */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Settings className="h-5 w-5 text-blue-500" />
              Paramètres de Langue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <label className="text-white font-medium">Langue d'affichage:</label>
              <Select 
                value={commercial.language || 'fr'} 
                onValueChange={updateLanguage}
              >
                <SelectTrigger className="w-48 bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Choisir une langue" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="fr" className="text-white hover:bg-gray-600">
                    🇫🇷 Français
                  </SelectItem>
                  <SelectItem value="en" className="text-white hover:bg-gray-600">
                    🇺🇸 English
                  </SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-400">
                Langue actuelle: {commercial.language === 'fr' ? 'Français' : 'English'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher par nom d'utilisateur ou nom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Leads Table */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <User className="h-5 w-5" />
              Balances des Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Chargement des données...</p>
              </div>
            ) : userLeads?.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">
                  {searchTerm ? 'Aucun lead trouvé pour cette recherche.' : 'Aucun lead trouvé pour ce commercial.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-600 hover:bg-gray-700">
                      <TableHead className="text-gray-300">Nom d'utilisateur</TableHead>
                      <TableHead className="text-gray-300">Nom</TableHead>
                      <TableHead className="text-gray-300">Balance (USD)</TableHead>
                      <TableHead className="text-gray-300">Statut</TableHead>
                      <TableHead className="text-gray-300">Date d'entrée</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userLeads?.map((lead) => (
                      <TableRow key={lead.id} className="border-gray-600 hover:bg-gray-700">
                        <TableCell className="text-gray-300 font-mono">
                          {lead.username}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {lead.name || '-'}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-500" />
                            <span className={`font-semibold ${(lead.balance || 0) > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                              ${(lead.balance || 0).toFixed(2)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          <span className={`px-2 py-1 rounded text-xs ${
                            lead.status === 'active' ? 'bg-green-600' : 
                            lead.status === 'blocked' ? 'bg-red-600' : 
                            'bg-gray-600'
                          }`}>
                            {lead.status || 'unknown'}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            {format(new Date(lead.created_at), 'dd/MM/yyyy HH:mm')}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompteView;