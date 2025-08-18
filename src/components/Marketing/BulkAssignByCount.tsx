import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Hash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import CommercialSelector from './CommercialSelector';

interface BulkAssignByCountProps {
  totalUnassignedLeads: number;
}

const BulkAssignByCount = ({ totalUnassignedLeads }: BulkAssignByCountProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedCommercial, setSelectedCommercial] = useState<string>('');
  const [numberOfLeads, setNumberOfLeads] = useState<string>('');

  const bulkAssignMutation = useMutation({
    mutationFn: async ({ commercialId, count }: { commercialId: string; count: number }) => {
      // Get unassigned leads (limited to the requested count)
      const { data: unassignedLeads, error: fetchError } = await supabase
        .from('marketing_contacts')
        .select('id')
        .is('commercial_id', null)
        .limit(count);
      
      if (fetchError) throw fetchError;
      
      if (unassignedLeads.length === 0) {
        throw new Error('No unassigned leads available');
      }

      // Assign these leads to the commercial
      const leadIds = unassignedLeads.map(lead => lead.id);
      const { error: updateError } = await supabase
        .from('marketing_contacts')
        .update({ commercial_id: commercialId })
        .in('id', leadIds);
      
      if (updateError) throw updateError;
      
      return { assignedCount: unassignedLeads.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['marketing-contacts'] });
      setOpen(false);
      setSelectedCommercial('');
      setNumberOfLeads('');
      toast({
        title: "Success",
        description: `${result.assignedCount} leads assigned successfully`,
      });
    },
    onError: (error: any) => {
      console.error('Bulk assign error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign leads",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const count = parseInt(numberOfLeads);
    
    if (!selectedCommercial) {
      toast({
        title: "Error",
        description: "Please select a commercial",
        variant: "destructive",
      });
      return;
    }
    
    if (!numberOfLeads || count <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid number of leads",
        variant: "destructive",
      });
      return;
    }
    
    if (count > totalUnassignedLeads) {
      toast({
        title: "Error",
        description: `Only ${totalUnassignedLeads} unassigned leads available`,
        variant: "destructive",
      });
      return;
    }

    bulkAssignMutation.mutate({ 
      commercialId: selectedCommercial, 
      count 
    });
  };

  if (totalUnassignedLeads === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
        >
          <Hash className="h-4 w-4 mr-2" />
          Assign by Count
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Assign Leads by Count</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-gray-300">
              Select Commercial
            </Label>
            <div className="mt-2">
              <CommercialSelector
                value={selectedCommercial}
                onValueChange={setSelectedCommercial}
                placeholder="Select commercial to assign to"
              />
            </div>
          </div>
          
          <div>
            <Label className="text-gray-300">
              Number of Leads to Assign
            </Label>
            <div className="mt-2">
              <Input
                type="number"
                min="1"
                max={totalUnassignedLeads}
                value={numberOfLeads}
                onChange={(e) => setNumberOfLeads(e.target.value)}
                placeholder={`Enter number (max: ${totalUnassignedLeads})`}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {totalUnassignedLeads} unassigned leads available
            </p>
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-600"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={bulkAssignMutation.isPending || !selectedCommercial || !numberOfLeads}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {bulkAssignMutation.isPending ? 'Assigning...' : 'Assign Leads'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BulkAssignByCount;