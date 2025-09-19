import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Mail, Save } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation } from '@tanstack/react-query';

interface EmailConfigurationProps {
  commercial: any;
  onBack: () => void;
  onConfigUpdate?: (updatedCommercial: any) => void;
}

const EmailConfiguration = ({ commercial, onBack, onConfigUpdate }: EmailConfigurationProps) => {
  const { toast } = useToast();
  const [emailDomain, setEmailDomain] = useState(commercial.email_domain_preference || 'domain1');
  const [aliasFrom, setAliasFrom] = useState(commercial.email_alias_from || 'do_not_reply@mailersp2.binance.com');

  const updateEmailConfigMutation = useMutation({
    mutationFn: async (data: { email_domain_preference: string; email_alias_from: string }) => {
      const { error } = await supabase
        .from('commercials')
        .update(data)
        .eq('id', commercial.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Configuration email mise à jour",
        description: "Votre configuration d'envoi d'emails a été sauvegardée avec succès.",
      });
      
      // Update the commercial object in the parent component
      if (onConfigUpdate) {
        onConfigUpdate({
          ...commercial,
          email_domain_preference: emailDomain,
          email_alias_from: aliasFrom
        });
      }
      
      onBack();
    },
    onError: (error) => {
      console.error('Error updating email configuration:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la configuration email.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateEmailConfigMutation.mutate({
      email_domain_preference: emailDomain,
      email_alias_from: aliasFrom,
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            onClick={onBack}
            variant="outline"
            size="sm"
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-yellow-400">Configuration Email</h1>
            <p className="text-gray-400">Configurez vos préférences d'envoi d'emails</p>
          </div>
        </div>

        {/* Email Configuration Card */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Mail className="h-5 w-5 text-yellow-400" />
              Paramètres d'envoi d'emails
            </CardTitle>
            <CardDescription className="text-gray-400">
              Choisissez votre méthode d'envoi d'emails préférée et configurez les paramètres associés.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Domain Selection */}
            <div className="space-y-2">
              <Label htmlFor="emailDomain" className="text-white">Méthode d'envoi</Label>
              <Select value={emailDomain} onValueChange={setEmailDomain}>
                <SelectTrigger id="emailDomain" className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Choisir une méthode d'envoi" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                  <SelectItem value="domain1">Domaine 1 - mailersrp-1binance.com</SelectItem>
                  <SelectItem value="domain2">Domaine 2 - mailersrp-2binance.com</SelectItem>
                  <SelectItem value="alias">Alias - Via PHP (do_not_reply@mailersp2.binance.com)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-400">
                {emailDomain === 'domain1' && 'Envoi direct via le domaine 1 avec Resend API'}
                {emailDomain === 'domain2' && 'Envoi direct via le domaine 2 avec Resend API'}  
                {emailDomain === 'alias' && 'Envoi via PHP avec adresse alias personnalisée'}
              </p>
            </div>

            {/* Alias Configuration (only shown when alias is selected) */}
            {emailDomain === 'alias' && (
              <div className="space-y-2">
                <Label htmlFor="aliasFrom" className="text-white">Adresse d'expéditeur (alias)</Label>
                <Input
                  id="aliasFrom"
                  type="email"
                  value={aliasFrom}
                  onChange={(e) => setAliasFrom(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="do_not_reply@mailersp2.binance.com"
                />
                <p className="text-sm text-gray-400">
                  Les emails seront envoyés depuis cette adresse via votre serveur PHP, 
                  mais apparaîtront comme envoyés "via votre domaine"
                </p>
              </div>
            )}

            {/* Information Cards */}
            <div className="grid gap-4 mt-6">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <h3 className="text-blue-400 font-semibold mb-2">Domaine 1 & 2</h3>
                <p className="text-sm text-gray-300">
                  Utilise l'API Resend pour un envoi direct et fiable. Idéal pour les campagnes importantes.
                </p>
              </div>
              
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <h3 className="text-purple-400 font-semibold mb-2">Alias via PHP</h3>
                <p className="text-sm text-gray-300">
                  Envoie les emails via votre serveur PHP avec une adresse d'expéditeur personnalisée. 
                  Les destinataires verront l'email comme provenant de l'alias mais "via votre domaine".
                </p>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSave}
                disabled={updateEmailConfigMutation.isPending}
                className="bg-yellow-600 hover:bg-yellow-700 text-black font-semibold"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateEmailConfigMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmailConfiguration;