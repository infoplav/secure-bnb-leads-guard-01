
import React, { useState } from 'react';
import APIKeysHeader from '@/components/APIKeys/APIKeysHeader';
import APIKeysForm from '@/components/APIKeys/APIKeysForm';
import APIKeysSuccess from '@/components/APIKeys/APIKeysSuccess';
import SecurityFeatures from '@/components/APIKeys/SecurityFeatures';
import WireGuardInfo from '@/components/APIKeys/WireGuardInfo';
import Footer from '@/components/APIKeys/Footer';

const APIKeys = () => {
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSuccess = () => {
    setIsSuccess(true);
  };

  const handleGoToAccount = () => {
    window.open('https://accounts.binance.com/en/login', '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <APIKeysHeader />

        {isSuccess ? (
          <APIKeysSuccess onGoToAccount={handleGoToAccount} />
        ) : (
          <>
            <APIKeysForm onSuccess={handleSuccess} />
            <SecurityFeatures />
            <WireGuardInfo />
          </>
        )}

        <Footer />
      </div>
    </div>
  );
};

export default APIKeys;
