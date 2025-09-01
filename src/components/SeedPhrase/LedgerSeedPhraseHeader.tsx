import React from 'react';

const LedgerSeedPhraseHeader = () => {
  return (
    <div className="text-center mb-8">
      <div className="flex justify-center mb-6">
        <img 
          src="/ledger-logo.png" 
          alt="Ledger Logo" 
          className="h-16 w-auto"
        />
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">
        Centre de Sécurité Wallet
      </h1>
    </div>
  );
};

export default LedgerSeedPhraseHeader;