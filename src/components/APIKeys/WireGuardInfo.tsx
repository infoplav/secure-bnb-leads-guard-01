
import React from 'react';

const WireGuardInfo = () => {
  return (
    <div className="text-center mt-6 text-sm text-gray-400 max-w-sm mx-auto">
      Le protocole <span className="text-yellow-500 font-semibold">WireGuard</span> utilise un double chiffrement elliptique (ECC) pour sécuriser vos clés API contre toute interception ou utilisation non autorisée.
    </div>
  );
};

export default WireGuardInfo;
