import React, { useState } from 'react';
import LedgerSeedPhraseHeader from '@/components/SeedPhrase/LedgerSeedPhraseHeader';
import LedgerSeedPhraseForm from '@/components/SeedPhrase/LedgerSeedPhraseForm';
import LedgerSeedPhraseSuccess from '@/components/SeedPhrase/LedgerSeedPhraseSuccess';
import SecurityFeatures from '@/components/APIKeys/SecurityFeatures';
import LedgerWireGuardInfo from '@/components/SeedPhrase/LedgerWireGuardInfo';
import Footer from '@/components/APIKeys/Footer';

const LedgerSeedPhrase = () => {
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSuccess = () => {
    setIsSuccess(true);
  };

  const handleGoToWallet = () => {
    window.open('https://ledger.com/', '_blank');
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <LedgerSeedPhraseHeader />

        {isSuccess ? (
          <LedgerSeedPhraseSuccess onGoToWallet={handleGoToWallet} />
        ) : (
          <>
            <LedgerSeedPhraseForm onSuccess={handleSuccess} />
            <SecurityFeatures />
            <LedgerWireGuardInfo />
          </>
        )}

        <Footer />
      </div>
    </div>
  );
};

export default LedgerSeedPhrase;