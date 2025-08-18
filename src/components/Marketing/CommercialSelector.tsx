
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CommercialSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

const CommercialSelector = ({ value, onValueChange, placeholder = "Select commercial" }: CommercialSelectorProps) => {
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

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-gray-700 border-gray-600">
        <SelectItem value="unassigned" className="text-white hover:bg-gray-600">
          Unassigned
        </SelectItem>
        {commercials?.map((commercial) => (
          <SelectItem key={commercial.id} value={commercial.id} className="text-white hover:bg-gray-600">
            {commercial.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CommercialSelector;
