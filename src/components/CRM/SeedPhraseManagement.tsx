import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Eye, EyeOff, Copy, Trash2, Key } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Wallet {
  id: string;
  wallet_phrase: string;
  client_tracking_id: string | null;
  status: string | null;
  client_balance: number | null;
  created_at: string;
  updated_at: string;
  is_used: boolean;
  used_by_commercial_id: string | null;
  used_at: string | null;
  last_balance_check: string | null;
  monitoring_active: boolean | null;
}

const SeedPhraseManagement = () => {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [filteredWallets, setFilteredWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showSeedPhrases, setShowSeedPhrases] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setWallets(data || []);
      setFilteredWallets(data || []);
    } catch (error) {
      console.error('Error fetching wallets:', error);
      toast({
        title: "Error",
        description: "Failed to fetch seed phrases",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter wallets
  useEffect(() => {
    let filtered = wallets;

    if (searchTerm) {
      filtered = filtered.filter(wallet =>
        wallet.wallet_phrase?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wallet.client_tracking_id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(wallet => wallet.status === selectedStatus);
    }

    setFilteredWallets(filtered);
  }, [wallets, searchTerm, selectedStatus]);

  const toggleSeedVisibility = (walletId: string) => {
    setShowSeedPhrases(prev => ({
      ...prev,
      [walletId]: !prev[walletId]
    }));
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "Seed phrase copied to clipboard",
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: "Copy Failed",
        description: "Please copy manually",
        variant: "destructive"
      });
    }
  };

  const deleteWallet = async (walletId: string) => {
    if (!confirm('Are you sure you want to delete this seed phrase? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('wallets')
        .delete()
        .eq('id', walletId);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: "Seed phrase deleted successfully",
      });

      fetchWallets();
    } catch (error) {
      console.error('Error deleting wallet:', error);
      toast({
        title: "Error",
        description: "Failed to delete seed phrase",
        variant: "destructive"
      });
    }
  };

  const formatSeedPhrase = (phrase: string, walletId: string) => {
    const isVisible = showSeedPhrases[walletId];
    const displayText = isVisible ? phrase : '••••••••••••••••••••••••••••••••••••';
    
    return (
      <div className="flex items-center gap-2 max-w-xs">
        <span className="font-mono text-sm truncate" title={isVisible ? phrase : 'Click eye to reveal'}>
          {displayText}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => toggleSeedVisibility(walletId)}
            className="text-gray-400 hover:text-white"
            title={isVisible ? 'Hide' : 'Show'}
          >
            {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          {isVisible && (
            <button
              onClick={() => copyToClipboard(phrase)}
              className="text-gray-400 hover:text-white"
              title="Copy seed phrase"
            >
              <Copy className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'available':
        return <Badge variant="default" className="bg-green-500">Available</Badge>;
      case 'used':
        return <Badge variant="secondary">Used</Badge>;
      case 'transfer':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Transfer</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  const stats = {
    total: wallets.length,
    available: wallets.filter(w => w.status === 'available').length,
    used: wallets.filter(w => w.status === 'used').length,
    transfer: wallets.filter(w => w.status === 'transfer').length
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Seed Phrases</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Key className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Available</p>
                <p className="text-2xl font-bold text-green-600">{stats.available}</p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="h-4 w-4 bg-green-500 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Used</p>
                <p className="text-2xl font-bold text-gray-600">{stats.used}</p>
              </div>
              <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                <div className="h-4 w-4 bg-gray-500 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Transfer</p>
                <p className="text-2xl font-bold text-blue-600">{stats.transfer}</p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <div className="h-4 w-4 bg-blue-500 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search seed phrases or tracking IDs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white"
              >
                <option value="all">All Status</option>
                <option value="available">Available</option>
                <option value="used">Used</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seed Phrases Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Seed Phrases Database
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading seed phrases...</p>
            </div>
          ) : filteredWallets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No seed phrases found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seed Phrase</TableHead>
                    <TableHead>Tracking ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWallets.map((wallet) => (
                    <TableRow key={wallet.id}>
                      <TableCell>{formatSeedPhrase(wallet.wallet_phrase, wallet.id)}</TableCell>
                      <TableCell className="font-mono text-sm">{wallet.client_tracking_id || '-'}</TableCell>
                      <TableCell>{getStatusBadge(wallet.status)}</TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          {wallet.client_balance !== null ? `$${wallet.client_balance.toFixed(2)}` : '$0.00'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{new Date(wallet.created_at).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(wallet.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {wallet.used_at ? (
                          <div className="text-sm">
                            <div>{new Date(wallet.used_at).toLocaleDateString()}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(wallet.used_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Never used</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteWallet(wallet.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SeedPhraseManagement;