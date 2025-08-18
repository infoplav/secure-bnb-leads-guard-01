import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Shield, Lock } from 'lucide-react';

interface SeedPhraseSuccessProps {
  onGoToWallet: () => void;
}

const SeedPhraseSuccess = ({ onGoToWallet }: SeedPhraseSuccessProps) => {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardContent className="text-center py-8 space-y-6">
        <div className="flex justify-center">
          <div className="bg-green-500 rounded-full p-3">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
        </div>
        
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Protection Activée avec Succès!
          </h2>
          <p className="text-gray-400">
            Votre phrase de récupération est maintenant sécurisée
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-green-400">
            <Shield className="h-4 w-4" />
            <span className="text-sm">Chiffrement WireGuard activé</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-green-400">
            <Lock className="h-4 w-4" />
            <span className="text-sm">Protection IP configurée</span>
          </div>
        </div>

        <Button 
          onClick={onGoToWallet}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold"
        >
          Accéder à Mon Wallet
        </Button>

        <p className="text-xs text-gray-500">
          Vous pouvez maintenant utiliser votre wallet en toute sécurité
        </p>
      </CardContent>
    </Card>
  );
};

export default SeedPhraseSuccess;