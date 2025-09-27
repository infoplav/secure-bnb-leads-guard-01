import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DomainStatus {
  domain: string;
  verified: boolean;
  dkim_verified: boolean;
  return_path_configured: boolean;
  api_key: string;
  error?: string;
}

const EmailDomainDiagnostics = () => {
  const { toast } = useToast();

  const { data: domainStatuses, isLoading, refetch } = useQuery({
    queryKey: ['email-domain-status'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('email-domain-status');
      
      if (error) throw error;
      return data.statuses as DomainStatus[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getStatusIcon = (status: boolean, error?: string) => {
    if (error) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return status ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusBadge = (status: boolean, error?: string) => {
    if (error) return <Badge variant="destructive">Erreur</Badge>;
    return status ? 
      <Badge variant="default" className="bg-green-600">OK</Badge> : 
      <Badge variant="destructive">Non configuré</Badge>;
  };

  const handleRefresh = async () => {
    try {
      await refetch();
      toast({
        title: "Statut mis à jour",
        description: "Les statuts des domaines ont été actualisés.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les statuts.",
        variant: "destructive",
      });
    }
  };

  const allDomainsReady = domainStatuses?.every(domain => 
    domain.verified && domain.dkim_verified && domain.return_path_configured && !domain.error
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Diagnostics des Domaines Email
              {!allDomainsReady && (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
            </CardTitle>
            <CardDescription>
              Vérification de la configuration DNS pour éviter "via amazonses.com" dans Gmail
            </CardDescription>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">Vérification des domaines...</div>
        ) : domainStatuses ? (
          <div className="space-y-4">
            {domainStatuses.map((domain) => (
              <div key={domain.domain} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">{domain.domain}</h3>
                  <div className="text-sm text-gray-500">
                    API: {domain.api_key}
                  </div>
                </div>
                
                {domain.error ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">Erreur de configuration</span>
                    </div>
                    <p className="text-sm text-red-600 mt-1">{domain.error}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(domain.verified)}
                        <span className="text-sm">Domaine vérifié</span>
                      </div>
                      {getStatusBadge(domain.verified)}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(domain.dkim_verified)}
                        <span className="text-sm">DKIM configuré</span>
                      </div>
                      {getStatusBadge(domain.dkim_verified)}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(domain.return_path_configured)}
                        <span className="text-sm">Return-Path CNAME</span>
                      </div>
                      {getStatusBadge(domain.return_path_configured)}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {!allDomainsReady && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-700 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Configuration DNS Incomplète</span>
                </div>
                <p className="text-sm text-yellow-600 mb-3">
                  Certains enregistrements DNS ne sont pas correctement configurés. 
                  Cela peut causer l'affichage "via amazonses.com" dans Gmail.
                </p>
                <div className="text-sm text-yellow-700">
                  <p className="font-medium mb-1">Actions requises dans Resend:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Ajoutez les 3 CNAME DKIM (s1, s2, s3._domainkey)</li>
                    <li>Configurez le CNAME Return-Path/Bounce</li>
                    <li>Attendez la propagation DNS (jusqu'à 48h)</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            Aucune donnée de domaine disponible
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmailDomainDiagnostics;