import React from 'react';
import { Button } from '@/components/ui/button';
import { Shuffle, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { redistributeAllLeads, validateLeadDistribution } from '@/services/leadRedistribution';

interface LeadRedistributionButtonProps {
  onRedistributionComplete: () => void;
  disabled?: boolean;
}

const LeadRedistributionButton = ({ onRedistributionComplete, disabled }: LeadRedistributionButtonProps) => {
  const { toast } = useToast();
  const [isRedistributing, setIsRedistributing] = React.useState(false);
  const [isValidating, setIsValidating] = React.useState(false);

  const handleRedistribute = async () => {
    setIsRedistributing(true);
    try {
      const result = await redistributeAllLeads();
      
      const summaryText = result.summary ? 
        `Distribution: ${result.summary.baseLeadsPerCommercial} leads de base + ${result.summary.remainder} commerciaux avec 1 lead supplémentaire. ${result.summary.finalUnassigned} leads non assignés.` :
        result.message;

      toast({
        title: "Redistribution terminée",
        description: `${summaryText} Distribution ${result.isBalanced ? 'parfaitement équilibrée' : 'déséquilibrée'}.`
      });

      onRedistributionComplete();
    } catch (error) {
      console.error('Error redistributing leads:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de redistribuer les leads",
        variant: "destructive"
      });
    } finally {
      setIsRedistributing(false);
    }
  };

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const validation = await validateLeadDistribution();
      
      const distributionText = validation.distribution
        .map(d => `${d.name}: ${d.count} leads (${d.variance >= 0 ? '+' : ''}${d.variance})`)
        .join('\n');

      toast({
        title: validation.isBalanced ? "Distribution équilibrée" : "Distribution déséquilibrée",
        description: `Total: ${validation.totalLeads} leads, ${validation.unassignedLeads} non assignés.\n${distributionText}`,
      });
    } catch (error) {
      console.error('Error validating leads:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de valider la distribution",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={handleValidate}
        disabled={disabled || isValidating || isRedistributing}
        variant="outline"
        className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
      >
        <BarChart3 className={`h-4 w-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} />
        {isValidating ? 'Vérification...' : 'Vérifier Distribution'}
      </Button>
      
      <Button
        onClick={handleRedistribute}
        disabled={disabled || isRedistributing || isValidating}
        className="bg-purple-600 hover:bg-purple-700 text-white"
      >
        <Shuffle className={`h-4 w-4 mr-2 ${isRedistributing ? 'animate-spin' : ''}`} />
        {isRedistributing ? 'Redistribution...' : 'Redistribuer Tous les Leads'}
      </Button>
    </div>
  );
};

export default LeadRedistributionButton;