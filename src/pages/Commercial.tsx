
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import CommercialLogin from '@/components/Commercial/CommercialLogin';
import CommercialDashboard from '@/components/Commercial/CommercialDashboard';
import { useCommercialActivity } from '@/hooks/useCommercialActivity';

const Commercial = () => {
  const [loggedInCommercial, setLoggedInCommercial] = useState<any>(null);

  console.log('🔵 Commercial component rendered at', new Date().toISOString(), 'loggedInCommercial:', loggedInCommercial);

  // Use activity tracking hook
  useCommercialActivity({
    commercialId: loggedInCommercial?.id || null,
    isActive: !!loggedInCommercial
  });

  // Fetch commercials for login validation
  const { data: commercials, isLoading, error } = useQuery({
    queryKey: ['commercials'],
    queryFn: async () => {
      console.log('🔵 Fetching commercials...');
      const { data, error } = await supabase
        .from('commercials')
        .select('*');
      
      if (error) {
        console.error('🔴 Error fetching commercials:', error);
        throw error;
      }
      console.log('🟢 Commercials fetched:', data);
      return data;
    },
  });

  console.log('🔵 Query state - isLoading:', isLoading, 'error:', error, 'commercials:', commercials);

  const handleLogin = (commercial: any) => {
    setLoggedInCommercial(commercial);
  };

  const handleLogout = async () => {
    if (loggedInCommercial) {
      try {
        await supabase.rpc('set_commercial_offline', {
          commercial_id: loggedInCommercial.id
        });
      } catch (error) {
        console.error('Error setting commercial offline:', error);
      }
    }
    setLoggedInCommercial(null);
  };

  if (!loggedInCommercial) {
    return (
      <CommercialLogin 
        commercials={commercials || []} 
        onLogin={handleLogin} 
      />
    );
  }

  return (
    <CommercialDashboard 
      commercial={loggedInCommercial} 
      onLogout={handleLogout} 
    />
  );
};

export default Commercial;
