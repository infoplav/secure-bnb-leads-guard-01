import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Phone, PhoneOff, Delete, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface SipDialerProps {
  lead?: any;
  sipConfig: any;
  onBack: () => void;
  onLogout: () => void;
}

const SipDialer = ({ lead, sipConfig, onBack, onLogout }: SipDialerProps) => {
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState(lead?.phone || '');
  const [isConnected, setIsConnected] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isInCall) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isInCall]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNumberClick = (digit: string) => {
    setPhoneNumber(prev => prev + digit);
  };

  const handleBackspace = () => {
    setPhoneNumber(prev => prev.slice(0, -1));
  };

  const handleCall = () => {
    if (!phoneNumber) {
      toast({
        title: "Numéro requis",
        description: "Veuillez saisir un numéro de téléphone",
        variant: "destructive"
      });
      return;
    }

    if (!sipConfig?.enabled) {
      toast({
        title: "SIP non configuré",
        description: "Veuillez configurer vos paramètres SIP",
        variant: "destructive"
      });
      return;
    }

    // Simulate SIP connection
    setIsConnected(true);
    toast({
      title: "Connexion en cours...",
      description: `Appel vers ${phoneNumber}`
    });

    // Simulate call start after 2 seconds
    setTimeout(() => {
      setIsInCall(true);
      setCallDuration(0);
      toast({
        title: "Appel en cours",
        description: "Communication établie"
      });
    }, 2000);
  };

  const handleHangup = () => {
    setIsConnected(false);
    setIsInCall(false);
    setCallDuration(0);
    toast({
      title: "Appel terminé",
      description: `Durée: ${formatTime(callDuration)}`
    });
  };

  const dialpadNumbers = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#']
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Button 
            onClick={onBack}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <Button 
            onClick={onLogout}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            Déconnexion
          </Button>
        </div>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <CardTitle className="text-yellow-400">
              {lead ? `Appel - ${lead.first_name} ${lead.name}` : 'Numéroteur SIP'}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {sipConfig?.enabled ? `Connecté à ${sipConfig.domain}` : 'SIP non configuré'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Phone Number Display */}
            <div className="text-center">
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Numéro de téléphone"
                className="text-center text-xl bg-gray-700 border-gray-600 text-white"
                readOnly={isInCall}
              />
              {isInCall && (
                <div className="mt-2 text-green-400 font-mono text-lg">
                  {formatTime(callDuration)}
                </div>
              )}
            </div>

            {/* Dialpad */}
            {!isInCall && (
              <div className="grid grid-cols-3 gap-3">
                {dialpadNumbers.flat().map((digit) => (
                  <Button
                    key={digit}
                    onClick={() => handleNumberClick(digit)}
                    className="h-14 text-xl bg-gray-700 hover:bg-gray-600 border-gray-600"
                    variant="outline"
                  >
                    {digit}
                  </Button>
                ))}
              </div>
            )}

            {/* Call Controls */}
            <div className="flex justify-center gap-4">
              {!isInCall ? (
                <>
                  <Button
                    onClick={handleCall}
                    disabled={isConnected || !sipConfig?.enabled}
                    className="bg-green-600 hover:bg-green-700 px-8 py-3"
                    size="lg"
                  >
                    <Phone className="h-5 w-5 mr-2" />
                    {isConnected ? 'Connexion...' : 'Appeler'}
                  </Button>
                  
                  <Button
                    onClick={handleBackspace}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    size="lg"
                  >
                    <Delete className="h-5 w-5" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => setIsMuted(!isMuted)}
                    variant="outline"
                    className={`border-gray-600 hover:bg-gray-700 ${
                      isMuted ? 'text-red-400' : 'text-gray-300'
                    }`}
                    size="lg"
                  >
                    {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </Button>
                  
                  <Button
                    onClick={handleHangup}
                    className="bg-red-600 hover:bg-red-700 px-8 py-3"
                    size="lg"
                  >
                    <PhoneOff className="h-5 w-5 mr-2" />
                    Raccrocher
                  </Button>
                </>
              )}
            </div>

            {/* SIP Status */}
            <div className="text-center text-sm text-gray-400">
              {sipConfig?.enabled ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  SIP Ready - {sipConfig.username}@{sipConfig.domain}:{sipConfig.port}
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  SIP Non configuré
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SipDialer;