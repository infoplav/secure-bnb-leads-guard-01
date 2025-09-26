import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Mail, AlertTriangle } from 'lucide-react';

const RepairWalletEmails = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const repairEmailsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('repair-wallet-emails');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Email Repair Completed",
        description: `Repaired ${data.repaired} out of ${data.processed} wallets`,
      });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['monitoring-data'] });
    },
    onError: (error: any) => {
      toast({
        title: "Email Repair Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Repair Wallet Emails
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">What this does:</p>
            <ul className="mt-1 list-disc list-inside space-y-1">
              <li>Finds wallets missing email information (client_tracking_id)</li>
              <li>Searches marketing contacts, user leads, and seed phrase submissions</li>
              <li>Updates wallets with found email addresses</li>
              <li>Improves email display in CRM and Transaction pages</li>
            </ul>
          </div>
        </div>
        
        <Button
          onClick={() => repairEmailsMutation.mutate()}
          disabled={repairEmailsMutation.isPending}
          className="w-full"
        >
          {repairEmailsMutation.isPending ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Repairing Emails...
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Repair Missing Emails
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default RepairWalletEmails;