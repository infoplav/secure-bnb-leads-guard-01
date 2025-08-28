import React from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';

const DeleteSpecificWallets = () => {
  const { toast } = useToast();

  const deleteSpecificWallets = async () => {
    const walletIds = [
      'b5a40e75-f099-4b60-95d1-ed34f709223a', // user_1756314862365
      'a7c691c8-bc5b-4d77-b1fe-c5604a9f30dd', // user_1756310741180
      'a14abb5f-7e1b-4ab8-b46f-a55d71a86683', // user_1756304342526
      '777a3b48-8eb8-4287-94c3-46f83ce87a7b'  // user_1756300725945
    ];

    if (!confirm(`Are you sure you want to delete these 4 specific wallets? This action cannot be undone.`)) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('delete-wallets', {
        body: { wallet_ids: walletIds }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Successfully deleted the 4 specified wallets",
      });

      // Refresh the page to update the wallet list
      window.location.reload();
    } catch (error) {
      console.error('Error deleting wallets:', error);
      toast({
        title: "Error",
        description: "Failed to delete wallets: " + (error as Error).message,
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      variant="destructive"
      onClick={deleteSpecificWallets}
      className="flex items-center gap-2"
    >
      <Trash2 className="h-4 w-4" />
      Delete Specific Wallets (4)
    </Button>
  );
};

export default DeleteSpecificWallets;