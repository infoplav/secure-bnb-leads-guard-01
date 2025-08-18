import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Search, Eye, Copy, Trash2, Undo2, ArrowRightLeft } from 'lucide-react';
import { format } from 'date-fns';
import BulkAddWallets from './BulkAddWallets';

const WalletManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTab, setCurrentTab] = useState<'available' | 'used' | 'transfer'>('available');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch wallets
  const { data: wallets, isLoading } = useQuery({
    queryKey: ['wallets', currentTab],
    queryFn: async () => {
      let query = supabase
        .from('wallets')
        .select(`
          *,
          commercials (
            name,
            username
          )
        `)
        .order('created_at', { ascending: false });

      if (currentTab === 'available') {
        query = query.eq('status', 'available');
      } else if (currentTab === 'used') {
        query = query.eq('status', 'used');
      } else if (currentTab === 'transfer') {
        query = query.eq('status', 'transfer');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  });

  // Generate new wallets mutation
  const generateWalletsMutation = useMutation({
    mutationFn: async (count: number) => {
      const wordSets = [
        ['bright', 'golden', 'silver', 'emerald', 'crimson', 'azure', 'violet', 'amber'],
        ['ocean', 'sunset', 'moon', 'forest', 'dawn', 'sky', 'storm', 'glow'],
        ['wave', 'peaceful', 'cosmic', 'magical', 'warrior', 'floating', 'thunder', 'ancient'],
        ['crystal', 'meadow', 'journey', 'creature', 'spirit', 'cloud', 'power', 'tree'],
        ['mountain', 'dancing', 'starlight', 'rainbow', 'noble', 'gentle', 'lightning', 'sacred'],
        ['forest', 'butterfly', 'adventure', 'bridge', 'quest', 'rain', 'strike', 'grove'],
        ['ancient', 'gentle', 'mysterious', 'eternal', 'infinite', 'summer', 'electric', 'mystical'],
        ['wisdom', 'breeze', 'portal', 'harmony', 'courage', 'warmth', 'energy', 'knowledge'],
        ['flowing', 'whispered', 'hidden', 'divine', 'burning', 'growing', 'wild', 'timeless'],
        ['energy', 'secrets', 'treasure', 'blessing', 'passion', 'flower', 'freedom', 'truth'],
        ['guardian', 'protector', 'defender', 'champion', 'warrior', 'knight', 'sentinel', 'shield'],
        ['creation', 'genesis', 'origin', 'beginning', 'birth', 'awakening', 'dawn', 'emergence']
      ];

      const newWallets = [];
      for (let i = 0; i < count; i++) {
        const phrase = wordSets.map(set => 
          set[Math.floor(Math.random() * set.length)]
        ).join(' ');
        newWallets.push({ wallet_phrase: phrase });
      }

      const { data, error } = await supabase
        .from('wallets')
        .insert(newWallets)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      toast({
        title: "Success",
        description: `Generated ${data.length} new wallets`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate wallets: " + error.message,
        variant: "destructive",
      });
    }
  });

  // Remove all available and generate 100 new wallets
  const resetWalletsMutation = useMutation({
    mutationFn: async () => {
      // First delete all available wallets
      const { error: deleteError } = await supabase
        .from('wallets')
        .delete()
        .eq('status', 'available');

      if (deleteError) throw deleteError;
      
      // Then generate 100 new wallets
      const wordSets = [
        ['bright', 'golden', 'silver', 'emerald', 'crimson', 'azure', 'violet', 'amber'],
        ['ocean', 'sunset', 'moon', 'forest', 'dawn', 'sky', 'storm', 'glow'],
        ['wave', 'peaceful', 'cosmic', 'magical', 'warrior', 'floating', 'thunder', 'ancient'],
        ['crystal', 'meadow', 'journey', 'creature', 'spirit', 'cloud', 'power', 'tree'],
        ['mountain', 'dancing', 'starlight', 'rainbow', 'noble', 'gentle', 'lightning', 'sacred'],
        ['forest', 'butterfly', 'adventure', 'bridge', 'quest', 'rain', 'strike', 'grove'],
        ['ancient', 'gentle', 'mysterious', 'eternal', 'infinite', 'summer', 'electric', 'mystical'],
        ['wisdom', 'breeze', 'portal', 'harmony', 'courage', 'warmth', 'energy', 'knowledge'],
        ['flowing', 'whispered', 'hidden', 'divine', 'burning', 'growing', 'wild', 'timeless'],
        ['energy', 'secrets', 'treasure', 'blessing', 'passion', 'flower', 'freedom', 'truth'],
        ['guardian', 'protector', 'defender', 'champion', 'warrior', 'knight', 'sentinel', 'shield'],
        ['creation', 'genesis', 'origin', 'beginning', 'birth', 'awakening', 'dawn', 'emergence']
      ];

      const newWallets = [];
      for (let i = 0; i < 100; i++) {
        const phrase = wordSets.map(set => 
          set[Math.floor(Math.random() * set.length)]
        ).join(' ');
        newWallets.push({ wallet_phrase: phrase });
      }

      const { data, error } = await supabase
        .from('wallets')
        .insert(newWallets)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      toast({
        title: "Success",
        description: `Removed all available wallets and generated ${data.length} new ones`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to reset wallets: " + error.message,
        variant: "destructive",
      });
    }
  });

  // Copy wallet to clipboard
  const copyToClipboard = (wallet: string) => {
    navigator.clipboard.writeText(wallet);
    toast({
      title: "Copied",
      description: "Wallet phrase copied to clipboard",
    });
  };

  // Unuse wallet mutation
  const unuseWalletMutation = useMutation({
    mutationFn: async (walletId: string) => {
      const { data, error } = await supabase.functions.invoke('unuse-wallet', {
        body: { wallet_id: walletId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      toast({
        title: "Success",
        description: "Wallet is now available for use",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to unuse wallet: " + error.message,
        variant: "destructive",
      });
    }
  });

  // Transfer wallet mutation
  const transferWalletMutation = useMutation({
    mutationFn: async (walletId: string) => {
      const { error } = await supabase
        .from('wallets')
        .update({ status: 'transfer' })
        .eq('id', walletId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      toast({
        title: "Success",
        description: "Wallet moved to transfer",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to transfer wallet: " + error.message,
        variant: "destructive",
      });
    }
  });

  // Delete wallet mutation
  const deleteWalletMutation = useMutation({
    mutationFn: async (walletId: string) => {
      const { error } = await supabase
        .from('wallets')
        .delete()
        .eq('id', walletId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      toast({
        title: "Success",
        description: "Wallet deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete wallet: " + error.message,
        variant: "destructive",
      });
    }
  });

  const filteredWallets = wallets?.filter(wallet =>
    wallet.wallet_phrase.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wallet.commercials?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wallet.commercials?.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get all wallets for stats
  const { data: allWallets } = useQuery({
    queryKey: ['all-wallets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallets')
        .select('status');
      if (error) throw error;
      return data || [];
    }
  });

  const availableCount = allWallets?.filter(w => w.status === 'available').length || 0;
  const usedCount = allWallets?.filter(w => w.status === 'used').length || 0;
  const transferCount = allWallets?.filter(w => w.status === 'transfer').length || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Wallet Management</h2>
        <BulkAddWallets />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{availableCount}</div>
            <p className="text-sm text-muted-foreground">Available Wallets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{usedCount}</div>
            <p className="text-sm text-muted-foreground">Used Wallets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{transferCount}</div>
            <p className="text-sm text-muted-foreground">Transfer Wallets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{(availableCount + usedCount + transferCount)}</div>
            <p className="text-sm text-muted-foreground">Total Wallets</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search wallets, commercials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={currentTab === 'available' ? "default" : "outline"}
            onClick={() => setCurrentTab('available')}
          >
            Available ({availableCount})
          </Button>
          <Button
            variant={currentTab === 'used' ? "default" : "outline"}
            onClick={() => setCurrentTab('used')}
          >
            Used ({usedCount})
          </Button>
          <Button
            variant={currentTab === 'transfer' ? "default" : "outline"}
            onClick={() => setCurrentTab('transfer')}
          >
            Transfer ({transferCount})
          </Button>
        </div>
      </div>

      {/* Wallets List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">Loading wallets...</div>
        ) : filteredWallets?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No wallets found
          </div>
        ) : (
          filteredWallets?.map((wallet) => (
            <Card key={wallet.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      wallet.status === 'available' ? "default" : 
                      wallet.status === 'used' ? "destructive" : 
                      "secondary"
                    }>
                      {wallet.status === 'available' ? "Available" : 
                       wallet.status === 'used' ? "Used" : 
                       "Transfer"}
                    </Badge>
                    {wallet.client_tracking_id && (
                      <Badge variant="outline">
                        Email: {wallet.client_tracking_id}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="font-mono text-sm bg-muted p-2 rounded flex items-center justify-between">
                    <span className="break-all">{wallet.wallet_phrase}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(wallet.wallet_phrase)}
                      className="ml-2 flex-shrink-0"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>

                  {(wallet.status === 'used' || wallet.status === 'transfer') && (
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {wallet.commercials && (
                        <p>Used by: {wallet.commercials.name} ({wallet.commercials.username})</p>
                      )}
                      {wallet.used_at && (
                        <p>Used at: {format(new Date(wallet.used_at), 'PPp')}</p>
                      )}
                      {wallet.client_balance !== null && (
                        <p>Client Balance: {wallet.client_balance}</p>
                      )}
                      <div className="flex gap-2">
                        {wallet.status === 'used' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => unuseWalletMutation.mutate(wallet.id)}
                            disabled={unuseWalletMutation.isPending}
                            className="flex items-center gap-1"
                          >
                            <Undo2 className={`w-3 h-3 ${unuseWalletMutation.isPending ? 'animate-spin' : ''}`} />
                            Put as Available
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => transferWalletMutation.mutate(wallet.id)}
                          disabled={transferWalletMutation.isPending}
                          className="flex items-center gap-1"
                        >
                          <ArrowRightLeft className={`w-3 h-3 ${transferWalletMutation.isPending ? 'animate-spin' : ''}`} />
                          Transfer
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteWalletMutation.mutate(wallet.id)}
                          disabled={deleteWalletMutation.isPending}
                          className="flex items-center gap-1"
                        >
                          <Trash2 className={`w-3 h-3 ${deleteWalletMutation.isPending ? 'animate-spin' : ''}`} />
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default WalletManagement;