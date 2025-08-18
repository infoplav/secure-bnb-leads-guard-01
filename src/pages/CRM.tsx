
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import CRMDashboard from '@/components/CRM/CRMDashboard';
import CRMLogin from '@/components/CRM/CRMLogin';

const CRM = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <CRMLogin />;
  }

  return <CRMDashboard />;
};

export default CRM;
