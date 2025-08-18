import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Filter, X } from 'lucide-react';

interface LeadFiltersProps {
  statusFilter: string;
  commercialFilter: string;
  onStatusChange: (status: string) => void;
  onCommercialChange: (commercial: string) => void;
  onClearFilters: () => void;
}

const LeadFilters = ({ 
  statusFilter, 
  commercialFilter, 
  onStatusChange, 
  onCommercialChange, 
  onClearFilters 
}: LeadFiltersProps) => {
  const { data: commercials } = useQuery({
    queryKey: ['commercials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commercials')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const statusOptions = [
    { value: 'new', label: 'New' },
    { value: 'callback', label: 'Callback' },
    { value: 'interested', label: 'Interested' },
    { value: 'not_interested', label: 'Not Interested' },
    { value: 'converted', label: 'Converted' },
    { value: 'not_answering_1', label: 'Not Answering 1' },
    { value: 'not_answering_2', label: 'Not Answering 2' },
    { value: 'not_answering_3', label: 'Not Answering 3' },
  ];

  const hasActiveFilters = statusFilter !== 'all' || commercialFilter !== 'all';

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Filter className="h-5 w-5" />
          Filters
          {hasActiveFilters && (
            <Button
              size="sm"
              variant="outline"
              onClick={onClearFilters}
              className="ml-auto border-gray-600 text-gray-300 hover:bg-gray-600"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-300 block mb-2">Status</label>
            <Select value={statusFilter} onValueChange={onStatusChange}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="all" className="text-gray-300">All Statuses</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value} className="text-gray-300">
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-gray-300 block mb-2">Assigned Commercial</label>
            <Select value={commercialFilter} onValueChange={onCommercialChange}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="All commercials" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="all" className="text-gray-300">All Commercials</SelectItem>
                <SelectItem value="unassigned" className="text-gray-300">Unassigned</SelectItem>
                {commercials?.map((commercial) => (
                  <SelectItem key={commercial.id} value={commercial.id} className="text-gray-300">
                    {commercial.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeadFilters;