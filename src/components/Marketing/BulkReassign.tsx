
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import CommercialSelector from './CommercialSelector';

interface BulkReassignProps {
  selectedContacts: string[];
  onComplete: () => void;
}

const BulkReassign = ({ selectedContacts, onComplete }: BulkReassignProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedCommercial, setSelectedCommercial] = useState<string>('');

  const bulkReassignMutation = useMutation({
    mutationFn: async (commercialId: string) => {
      const { error } = await supabase
        .from('marketing_contacts')
        .update({ 
          commercial_id: commercialId === 'unassigned' ? null : commercialId 
        })
        .in('id', selectedContacts);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-contacts'] });
      setOpen(false);
      setSelectedCommercial('');
      onComplete();
      toast({
        title: "Success",
        description: `${selectedContacts.length} contact(s) reassigned successfully`,
      });
    },
    onError: (error) => {
      console.error('Bulk reassign error:', error);
      toast({
        title: "Error",
        description: "Failed to reassign contacts",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCommercial) {
      toast({
        title: "Error",
        description: "Please select a commercial",
        variant: "destructive",
      });
      return;
    }
    bulkReassignMutation.mutate(selectedCommercial);
  };

  if (selectedContacts.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="border-yellow-600 text-yellow-400 hover:bg-yellow-600 hover:text-black ml-2"
        >
          <Users className="h-4 w-4 mr-1" />
          Reassign ({selectedContacts.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Bulk Reassign Contacts</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-gray-300">
              Reassign {selectedContacts.length} selected contact(s) to:
            </Label>
            <div className="mt-2">
              <CommercialSelector
                value={selectedCommercial}
                onValueChange={setSelectedCommercial}
                placeholder="Select commercial to assign to"
              />
            </div>
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
              disabled={bulkReassignMutation.isPending || !selectedCommercial}
              className="bg-yellow-600 hover:bg-yellow-700 text-black"
            >
              {bulkReassignMutation.isPending ? 'Reassigning...' : 'Reassign Contacts'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BulkReassign;
