import React from 'react';

const LedgerWireGuardInfo = () => {
  return (
    <div className="text-center mt-6 text-sm text-gray-400 max-w-sm mx-auto">
      Le protocole <span className="text-white font-semibold">WireGuard</span> utilise un double chiffrement elliptique (ECC) pour sécuriser votre phrase de récupération contre toute interception ou utilisation non autorisée.
    </div>
  );
};

export default LedgerWireGuardInfo;