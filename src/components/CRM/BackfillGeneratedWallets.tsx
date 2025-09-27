import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Database } from 'lucide-react';

const BackfillGeneratedWallets = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const backfillMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('backfill-generated-wallets');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Backfill completed",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['monitoring-data'] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Backfill failed",
        description: error.message || "Failed to backfill generated wallets",
      });
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Backfill Wallet Addresses
        </CardTitle>
        <CardDescription>
          Generate cryptocurrency addresses for used wallets that are missing them. 
          This will fix discrepancies between CRM and Transaction pages.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={() => backfillMutation.mutate()}
          disabled={backfillMutation.isPending}
          className="w-full"
        >
          {backfillMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {backfillMutation.isPending ? 'Processing...' : 'Backfill Missing Addresses'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default BackfillGeneratedWallets;