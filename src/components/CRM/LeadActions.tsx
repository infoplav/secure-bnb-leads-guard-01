
import React from 'react';
import { Button } from '@/components/ui/button';
import { Shield, ShieldBan, User, Eye } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LeadActionsProps {
  leadId: string;
  currentStatus: string;
  onStatusChange: (leadId: string, status: string) => void;
  onViewDetails: (leadId: string) => void;
  language: string;
}

export const LeadActions: React.FC<LeadActionsProps> = ({
  leadId,
  currentStatus,
  onStatusChange,
  onViewDetails,
  language
}) => {
  const t = {
    en: {
      actions: 'Actions',
      blockIp: 'Block IP',
      unblockIp: 'Unblock IP',
      markAsSuspicious: 'Mark as Suspicious',
      markAsBot: 'Mark as Bot',
      markAsActive: 'Mark as Active',
      viewDetails: 'View Details'
    },
    fr: {
      actions: 'Actions',
      blockIp: 'Bloquer IP',
      unblockIp: 'Débloquer IP',
      markAsSuspicious: 'Marquer comme Suspect',
      markAsBot: 'Marquer comme Bot',
      markAsActive: 'Marquer comme Actif',
      viewDetails: 'Voir Détails'
    }
  };

  const currentLang = t[language as keyof typeof t];

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant={currentStatus === 'blocked' ? 'default' : 'destructive'}
        onClick={() => onStatusChange(leadId, currentStatus === 'blocked' ? 'active' : 'blocked')}
      >
        {currentStatus === 'blocked' ? (
          <>
            <Shield className="h-4 w-4 mr-1" />
            {currentLang.unblockIp}
          </>
        ) : (
          <>
            <ShieldBan className="h-4 w-4 mr-1" />
            {currentLang.blockIp}
          </>
        )}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            {currentLang.actions}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onViewDetails(leadId)}>
            <Eye className="h-4 w-4 mr-2" />
            {currentLang.viewDetails}
          </DropdownMenuItem>
          {currentStatus !== 'active' && (
            <DropdownMenuItem onClick={() => onStatusChange(leadId, 'active')}>
              <User className="h-4 w-4 mr-2" />
              {currentLang.markAsActive}
            </DropdownMenuItem>
          )}
          {currentStatus !== 'suspicious' && (
            <DropdownMenuItem onClick={() => onStatusChange(leadId, 'suspicious')}>
              <Shield className="h-4 w-4 mr-2" />
              {currentLang.markAsSuspicious}
            </DropdownMenuItem>
          )}
          {currentStatus !== 'bot' && (
            <DropdownMenuItem onClick={() => onStatusChange(leadId, 'bot')}>
              <ShieldBan className="h-4 w-4 mr-2" />
              {currentLang.markAsBot}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
