import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Search, Eye, Copy, Trash2, Undo2, ArrowRightLeft, Calendar, Filter, Clock, Settings } from 'lucide-react';
import { format } from 'date-fns';
import RepairWalletEmails from './RepairWalletEmails';

const WalletManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTab, setCurrentTab] = useState<'available' | 'used' | 'transfer'>('available');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [idTypeFilter, setIdTypeFilter] = useState<'all' | 'email' | 'complex'>('all');
  const [selectedWallets, setSelectedWallets] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Update time every minute for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Calculate remaining monitoring time
  const getMonitoringTimeLeft = (usedAt: string) => {
    if (!usedAt) return null;
    
    const usedDate = new Date(usedAt);
    const monitoringEndDate = new Date(usedDate.getTime() + (48 * 60 * 60 * 1000)); // 48 hours
    const timeLeft = monitoringEndDate.getTime() - currentTime.getTime();
    
    if (timeLeft <= 0) return "Monitoring ended";
    
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}min`;
  };

  // Fetch wallets with enhanced data
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
      
      // Enhance wallets with additional email information
      const enhancedWallets = await Promise.all((data || []).map(async (wallet: any) => {
        let displayEmail = wallet.client_tracking_id;
        
        // If no client_tracking_id, try to find email from related data
        if (!displayEmail && wallet.used_by_commercial_id) {
          try {
            // Try to find marketing contact
            const { data: contact } = await supabase
              .from('marketing_contacts')
              .select('email, name')
              .eq('commercial_id', wallet.used_by_commercial_id)
              .order('updated_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            if (contact?.email) {
              displayEmail = contact.email;
            }
          } catch (err) {
            console.warn('Error fetching contact for wallet:', wallet.id, err);
          }
        }
        
        return {
          ...wallet,
          _displayEmail: displayEmail,
          _hasEmail: !!displayEmail && displayEmail.includes('@')
        };
      }));
      
      return enhancedWallets;
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

  // Bulk unuse mutation (make wallets available again)
  const bulkUnuseMutation = useMutation({
    mutationFn: async (walletIds: string[]) => {
      const { error } = await supabase
        .from('wallets')
        .update({ 
          status: 'available',
          used_by_commercial_id: null,
          used_at: null,
          client_tracking_id: null,
          client_balance: 0
        })
        .in('id', walletIds);
      
      if (error) throw error;
      
      return walletIds;
    },
    onSuccess: (unusedIds) => {
      toast({
        title: "Success",
        description: `${unusedIds.length} wallets are now available`,
      });
      setSelectedWallets([]);
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['all-wallets'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to unuse wallets: " + error.message,
        variant: "destructive",
      });
    }
  });

  // Selection handlers
  const toggleWalletSelection = (walletId: string) => {
    setSelectedWallets(prev => 
      prev.includes(walletId) 
        ? prev.filter(id => id !== walletId)
        : [...prev, walletId]
    );
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedWallets(filteredWallets?.map(w => w.id) || []);
    } else {
      setSelectedWallets([]);
    }
  };

  const handleBulkUnuse = () => {
    if (selectedWallets.length > 0) {
      const confirmed = window.confirm(
        `Are you sure you want to make ${selectedWallets.length} selected wallets available again?`
      );
      if (confirmed) {
        bulkUnuseMutation.mutate(selectedWallets);
      }
    }
  };

  // Clear selection when tab changes
  React.useEffect(() => {
    setSelectedWallets([]);
  }, [currentTab]);

  // Helper function to check if ID is email format
  const isEmailFormat = (id: string) => {
    return id && id.includes('@');
  };

  // Helper function to check if ID is complex UUID format
  const isComplexFormat = (id: string) => {
    return id && id.includes('_') && (id.includes('-') || id.length > 20);
  };

  const filteredWallets = wallets?.filter(wallet => {
    // Text search filter
    const matchesSearch = wallet.wallet_phrase.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wallet.commercials?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wallet.commercials?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (wallet.client_tracking_id && wallet.client_tracking_id.toLowerCase().includes(searchTerm.toLowerCase()));

    // Date filter (only for used wallets)
    let matchesDate = true;
    if (currentTab === 'used' && wallet.used_at && (dateFrom || dateTo)) {
      const walletDate = new Date(wallet.used_at);
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        if (walletDate < fromDate) matchesDate = false;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        if (walletDate > toDate) matchesDate = false;
      }
    }

    // ID type filter
    let matchesIdType = true;
    if (currentTab === 'used' && idTypeFilter !== 'all' && wallet.client_tracking_id) {
      if (idTypeFilter === 'email' && !isEmailFormat(wallet.client_tracking_id)) {
        matchesIdType = false;
      }
      if (idTypeFilter === 'complex' && !isComplexFormat(wallet.client_tracking_id)) {
        matchesIdType = false;
      }
    }

    return matchesSearch && matchesDate && matchesIdType;
  });

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
        <div className="flex items-center gap-2">
          <RepairWalletEmails />
        </div>
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

      {/* Additional Filters for Used Wallets */}
      {currentTab === 'used' && (
        <div className="flex flex-col sm:flex-row gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Additional Filters:</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm">From:</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-auto"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm">To:</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-auto"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm">ID Type:</label>
            <Select value={idTypeFilter} onValueChange={(value) => setIdTypeFilter(value as 'all' | 'email' | 'complex')}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="email">Email Format</SelectItem>
                <SelectItem value="complex">Complex ID</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {(dateFrom || dateTo || idTypeFilter !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setIdTypeFilter('all');
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      )}

      {/* Bulk Actions for Used Wallets */}
      {currentTab === 'used' && filteredWallets && filteredWallets.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
          <div className="flex items-center gap-4">
            <Checkbox
              checked={selectedWallets.length === filteredWallets.length}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-sm text-muted-foreground">
              {selectedWallets.length > 0 
                ? `${selectedWallets.length} of ${filteredWallets.length} wallets selected`
                : `Select all ${filteredWallets.length} wallets`
              }
            </span>
          </div>
          {selectedWallets.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkUnuse}
              disabled={bulkUnuseMutation.isPending}
            >
              <Undo2 className="w-4 h-4 mr-2" />
              Make {selectedWallets.length} Available
            </Button>
          )}
        </div>
      )}

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
              <div className="flex items-start gap-4">
                {/* Checkbox for used wallets */}
                {currentTab === 'used' && (
                  <Checkbox
                    checked={selectedWallets.includes(wallet.id)}
                    onCheckedChange={() => toggleWalletSelection(wallet.id)}
                    className="mt-1"
                  />
                )}
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
                    {wallet._displayEmail && (
                      <Badge variant={wallet._hasEmail ? "default" : "outline"}>
                        {wallet._hasEmail ? "📧" : "ID"}: {wallet._displayEmail}
                      </Badge>
                    )}
                    {!wallet._displayEmail && wallet.used_by_commercial_id && (
                      <Badge variant="secondary">
                        No Email Found
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
                      {wallet.used_at && wallet.status === 'used' && (
                        <div className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span className="text-blue-800 font-medium">
                            Time left monitoring: {getMonitoringTimeLeft(wallet.used_at)}
                          </span>
                        </div>
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