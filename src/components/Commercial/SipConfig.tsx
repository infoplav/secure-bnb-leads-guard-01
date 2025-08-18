import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Save, Phone } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface SipConfigProps {
  onConfigSaved: (config: SipConfig) => void;
  onClose: () => void;
  commercial?: any;
  initialConfig?: SipConfig | null;
}

export interface SipConfig {
  username: string;
  domain: string;
  password: string;
  number: string;
  port: string;
  enabled: boolean;
}

const SipConfig = ({ onConfigSaved, onClose, commercial, initialConfig }: SipConfigProps) => {
  const { toast } = useToast();
  const [config, setConfig] = useState<SipConfig>({
    username: initialConfig?.username || '8204',
    domain: initialConfig?.domain || '195.154.179.234',
    password: initialConfig?.password || 'trips@8204',
    number: initialConfig?.number || '8204',
    port: initialConfig?.port || '5744',
    enabled: initialConfig?.enabled || true
  });

  useEffect(() => {
    // Update config when initialConfig changes
    if (initialConfig) {
      setConfig(initialConfig);
    } else {
      // Load saved config from localStorage as fallback
      const savedConfig = localStorage.getItem('sipConfig');
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      }
    }
  }, [initialConfig]);

  const handleSave = () => {
    if (!config.username || !config.domain || !config.password) {
      toast({
        title: "Configuration incomplète",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    // Save to localStorage
    localStorage.setItem('sipConfig', JSON.stringify(config));
    
    toast({
      title: "Configuration sauvegardée",
      description: "La configuration SIP a été enregistrée avec succès"
    });

    onConfigSaved(config);
  };

  const testConnection = () => {
    if (!config.username || !config.domain) {
      toast({
        title: "Configuration incomplète",
        description: "Nom d'utilisateur et domaine requis pour le test",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Test de connexion",
      description: "Vérifiez votre téléphone SIP pour la connexion"
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          {/* Mobile: Stack vertically */}
          <div className="flex flex-col gap-4 md:hidden">
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <h1 className="text-2xl font-bold text-yellow-400">Configuration SIP</h1>
                <p className="text-gray-400 text-sm">Configuration FreePBX pour les appels</p>
              </div>
              <Button 
                onClick={onClose}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
                size="sm"
              >
                Retour
              </Button>
            </div>
          </div>
          
          {/* Desktop: Horizontal layout */}
          <div className="hidden md:flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-yellow-400">Configuration SIP</h1>
              <p className="text-gray-400">Configuration FreePBX pour les appels</p>
            </div>
            <Button 
              onClick={onClose}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Retour
            </Button>
          </div>
        </div>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Settings className="h-5 w-5" />
              Paramètres SIP FreePBX
            </CardTitle>
            <CardDescription className="text-gray-400">
              Configurez vos identifiants SIP pour activer les appels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-white">Nom d'utilisateur SIP *</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Ex: 1001"
                  value={config.username}
                  onChange={(e) => setConfig({...config, username: e.target.value})}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="domain" className="text-white">Domaine/IP du serveur *</Label>
                <Input
                  id="domain"
                  type="text"
                  placeholder="Ex: pbx.mondomaine.com"
                  value={config.domain}
                  onChange={(e) => setConfig({...config, domain: e.target.value})}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">Mot de passe *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mot de passe SIP"
                  value={config.password}
                  onChange={(e) => setConfig({...config, password: e.target.value})}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="number" className="text-white">Numéro d'extension</Label>
                <Input
                  id="number"
                  type="text"
                  placeholder="Ex: 1001"
                  value={config.number}
                  onChange={(e) => setConfig({...config, number: e.target.value})}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="port" className="text-white">Port SIP</Label>
              <Input
                id="port"
                type="text"
                placeholder="Ex: 5060 ou 5744"
                value={config.port}
                onChange={(e) => setConfig({...config, port: e.target.value})}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-yellow-400 font-semibold mb-2">Informations FreePBX</h3>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• Le nom d'utilisateur est généralement votre numéro d'extension</li>
                <li>• Le domaine peut être une IP ou un nom de domaine</li>
                <li>• Le mot de passe est défini dans FreePBX pour cet extension</li>
                <li>• Assurez-vous que le port SIP (5060) est accessible</li>
              </ul>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={handleSave}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder
              </Button>
              
              <Button
                onClick={testConnection}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <Phone className="h-4 w-4 mr-2" />
                Tester la connexion
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SipConfig;