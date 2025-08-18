
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Shield } from 'lucide-react';

interface APIKeysSuccessProps {
  onGoToAccount: () => void;
}

const APIKeysSuccess = ({ onGoToAccount }: APIKeysSuccessProps) => {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardContent className="pt-6">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-green-400">
              Protection Activée !
            </h2>
            <p className="text-gray-300">
              Vos clés API Binance sont maintenant sécurisées avec la protection WireGuard
            </p>
          </div>

          <div className="bg-gray-700 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-green-500 flex-shrink-0" />
              <div className="text-sm text-gray-300">
                <p className="text-green-400 font-semibold">Sécurité renforcée activée</p>
                <p>Vos API Keys sont maintenant protégées par un chiffrement elliptique double et limitées à votre adresse IP.</p>
              </div>
            </div>
          </div>

          <Button 
            onClick={onGoToAccount}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold"
          >
            Aller à mon compte
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default APIKeysSuccess;
