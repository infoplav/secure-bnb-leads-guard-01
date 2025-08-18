import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, LogOut, RefreshCw, DollarSign, User, Calendar, Globe, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LeadDetailsViewProps {
  userLead: any;
  commercial: any;
  onBack: () => void;
  onLogout: () => void;
}

const LeadDetailsView = ({ userLead, commercial, onBack, onLogout }: LeadDetailsViewProps) => {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: leadData, refetch } = useQuery({
    queryKey: ['user-lead-details', userLead?.id],
    queryFn: async () => {
      if (!userLead?.id) return userLead;
      
      const { data, error } = await supabase
        .from('user_leads')
        .select('*')
        .eq('id', userLead.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!userLead?.id,
    initialData: userLead
  });

  const handleRefreshBalance = async () => {
    if (!leadData?.api_key || !leadData?.secret_key) {
      toast({
        title: "Erreur",
        description: "Clés API manquantes pour vérifier le solde",
        variant: "destructive"
      });
      return;
    }

    setIsRefreshing(true);
    try {
      const { data: checkResult, error } = await supabase.functions.invoke('check-balance', {
        body: {
          api_key: leadData.api_key,
          secret_key: leadData.secret_key,
          lead_id: leadData.id
        }
      });

      if (error) throw error;

      await refetch();
      
      toast({
        title: "Solde mis à jour",
        description: `Nouveau solde: $${checkResult?.balance_usd || 'Inconnu'}`,
      });
    } catch (error) {
      console.error('Error refreshing balance:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le solde",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-3 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <Button 
              onClick={onBack}
              variant="outline"
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-800 w-fit"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl font-bold text-yellow-400 leading-tight">
                Détails du Lead
              </h1>
              <p className="text-sm sm:text-base text-gray-400 truncate">
                {leadData?.name || leadData?.username}
              </p>
            </div>
          </div>
          <Button 
            onClick={onLogout}
            variant="outline"
            size="sm"
            className="border-gray-600 text-gray-300 hover:bg-gray-800 w-fit sm:w-auto"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Déconnexion</span>
            <span className="sm:hidden">Logout</span>
          </Button>
        </div>

        {/* Balance Card */}
        <Card className="bg-gradient-to-r from-green-600 to-emerald-600 border-green-500 mb-6">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Balance: ${leadData?.balance || leadData?.balance_usd || 'Inconnue'}
                  </h2>
                  <p className="text-green-100">
                    {leadData?.balance_error ? `Erreur: ${leadData.balance_error}` : 'Solde actuel'}
                  </p>
                </div>
              </div>
              <Button
                onClick={handleRefreshBalance}
                disabled={isRefreshing}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lead Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <User className="h-5 w-5" />
                Informations de base
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm text-gray-400">Nom d'utilisateur</label>
                <p className="text-white">{leadData?.username || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Nom</label>
                <p className="text-white">{leadData?.name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Commercial assigné</label>
                <p className="text-white">{leadData?.commercial_name || commercial.name}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Statut</label>
                <span className={`px-2 py-1 rounded text-xs ${
                  leadData?.status === 'active' ? 'bg-green-600 text-white' :
                  leadData?.status === 'blocked' ? 'bg-red-600 text-white' :
                  'bg-gray-600 text-white'
                }`}>
                  {leadData?.status || 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Technical Information */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Shield className="h-5 w-5" />
                Informations techniques
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm text-gray-400">Adresse IP</label>
                <p className="text-white font-mono">{leadData?.ip_address || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">User Agent</label>
                <p className="text-white text-sm break-all">{leadData?.user_agent || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Clé API</label>
                <p className="text-white font-mono text-sm break-all">
                  {leadData?.api_key ? `${leadData.api_key.substring(0, 8)}...` : 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Calendar className="h-5 w-5" />
                Dates importantes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm text-gray-400">Créé le</label>
                <p className="text-white">{leadData?.created_at ? formatDate(leadData.created_at) : 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Dernière mise à jour</label>
                <p className="text-white">{leadData?.updated_at ? formatDate(leadData.updated_at) : 'N/A'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Globe className="h-5 w-5" />
                Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={handleRefreshBalance}
                disabled={isRefreshing}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Vérifier le solde
              </Button>
              <p className="text-xs text-gray-400">
                Dernière vérification: {leadData?.updated_at ? formatDate(leadData.updated_at) : 'Jamais'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LeadDetailsView;