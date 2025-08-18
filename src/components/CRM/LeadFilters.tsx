
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, RefreshCw } from 'lucide-react';

interface LeadFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  onRefresh: () => void;
  language: string;
}

export const LeadFilters: React.FC<LeadFiltersProps> = ({
  searchTerm,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  onRefresh,
  language
}) => {
  const t = {
    en: {
      searchPlaceholder: 'Search by username, name, or IP...',
      allStatus: 'All Status',
      active: 'Active',
      blocked: 'Blocked',
      suspicious: 'Suspicious',
      bot: 'Bot',
      refresh: 'Refresh'
    },
    fr: {
      searchPlaceholder: 'Rechercher par nom d\'utilisateur, nom ou IP...',
      allStatus: 'Tous les Statuts',
      active: 'Actif',
      blocked: 'Bloqué',
      suspicious: 'Suspect',
      bot: 'Bot',
      refresh: 'Actualiser'
    }
  };

  const currentLang = t[language as keyof typeof t];

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder={currentLang.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2 items-center">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={selectedStatus}
              onChange={(e) => onStatusChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white min-w-[120px]"
            >
              <option value="all">{currentLang.allStatus}</option>
              <option value="active">{currentLang.active}</option>
              <option value="blocked">{currentLang.blocked}</option>
              <option value="suspicious">{currentLang.suspicious}</option>
              <option value="bot">{currentLang.bot}</option>
            </select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              {currentLang.refresh}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
