
import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Lock, Shield, CheckCircle } from 'lucide-react';

const SecurityFeatures = () => {
  return (
    <div className="flex justify-center gap-8 mt-8 text-sm">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 text-gray-400">
              <Lock className="h-4 w-4" />
              <span>SSL Sécurisé</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Connexion SSL sécurisée</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 text-gray-400">
              <Shield className="h-4 w-4" />
              <span>Protection IP</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Protection par adresse IP</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 text-gray-400">
              <CheckCircle className="h-4 w-4" />
              <span>Vérification API</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Vérification automatique des API</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default SecurityFeatures;
