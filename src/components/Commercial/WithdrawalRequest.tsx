import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, DollarSign, Send } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface WithdrawalRequestProps {
  commercial: any;
  onBack: () => void;
}

const WithdrawalRequest: React.FC<WithdrawalRequestProps> = ({ commercial, onBack }) => {
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const withdrawalAmount = parseFloat(amount);
    if (!withdrawalAmount || withdrawalAmount <= 0) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un montant valide",
        variant: "destructive"
      });
      return;
    }

    if (withdrawalAmount > commercial.balance) {
      toast({
        title: "Erreur",
        description: "Montant supérieur au solde disponible",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke('withdrawal-request', {
        body: {
          commercial_id: commercial.id,
          amount: withdrawalAmount,
          reason: reason || 'Demande de retrait'
        }
      });

      if (error) throw error;

      toast({
        title: "Demande envoyée",
        description: "Votre demande de retrait a été transmise aux administrateurs",
      });

      setAmount('');
      setReason('');
      onBack();
    } catch (error) {
      console.error('Error submitting withdrawal request:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la demande. Veuillez réessayer.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-3 sm:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            onClick={onBack}
            variant="outline"
            size="sm"
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-2xl font-bold text-yellow-400">Demande de Retrait</h1>
        </div>

        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-green-800 to-green-600 border-green-500 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Solde Disponible</h3>
                <p className="text-3xl font-bold text-green-100">
                  ${commercial.balance?.toFixed(2) || '0.00'}
                </p>
                <p className="text-sm text-green-200 mt-1">
                  Commission: {commercial.commission_rate || 80}%
                </p>
              </div>
              <div className="bg-green-700/50 p-3 rounded-full">
                <DollarSign className="h-8 w-8 text-green-200" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Withdrawal Form */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Formulaire de Retrait</CardTitle>
            <CardDescription className="text-gray-400">
              Remplissez les informations ci-dessous pour demander un retrait
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-sm text-gray-300 block mb-2">
                  Montant à retirer (USD)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={commercial.balance || 0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-gray-700 border-gray-600 text-white"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Minimum: $1.00 • Maximum: ${commercial.balance?.toFixed(2) || '0.00'}
                </p>
              </div>

              <div>
                <label className="text-sm text-gray-300 block mb-2">
                  Raison du retrait (optionnel)
                </label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Paiement personnel, frais, etc..."
                  className="bg-gray-700 border-gray-600 text-white"
                  rows={3}
                />
              </div>

              <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
                <h4 className="text-blue-300 font-medium mb-2">Informations importantes</h4>
                <ul className="text-sm text-blue-200 space-y-1">
                  <li>• La demande sera transmise aux administrateurs</li>
                  <li>• Délai de traitement: 24-48h ouvrées</li>
                  <li>• Vous recevrez une confirmation par Telegram</li>
                  <li>• Le montant sera déduit après validation</li>
                </ul>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                {isSubmitting ? 'Envoi en cours...' : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Envoyer la demande
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WithdrawalRequest;