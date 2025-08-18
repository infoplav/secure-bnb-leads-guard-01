import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';

const BulkAddWallets = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Bulk insert wallets mutation
  const bulkInsertMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('bulk-insert-wallets');

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      toast({
        title: "Success",
        description: `Added ${data.inserted_count} wallets successfully`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add wallets: " + error.message,
        variant: "destructive",
      });
    }
  });

  return (
    <Button
      onClick={() => bulkInsertMutation.mutate()}
      disabled={bulkInsertMutation.isPending}
      className="flex items-center gap-2"
    >
      <Plus className={`w-4 h-4 ${bulkInsertMutation.isPending ? 'animate-spin' : ''}`} />
      Add 100 Predefined Wallets
    </Button>
  );
};

export default BulkAddWallets;