import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, Activity, RefreshCw, Eye, Wallet2, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Transaction = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const queryClient = useQueryClient();

  // Auto refresh every 30 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['monitoring-data'] });
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, queryClient]);

  // Fetch unified monitoring data with wallet groups and their transactions
  const { data: monitoringData, isLoading, refetch } = useQuery({
    queryKey: ['monitoring-data'],
    queryFn: async () => {
      // Get all wallet data with transactions
      const { data: walletData, error: walletError } = await supabase
        .from('generated_wallets')
        .select(`
          id,
          eth_address,
          btc_address,
          bsc_address,
          created_at,
          is_monitoring_active,
          commercial_id,
          wallets (
            id,
            wallet_phrase,
            client_tracking_id,
            status,
            used_at,
            last_balance_check,
            client_balance,
            used_by_commercial_id
          ),
          commercials (
            id,
            name
          ),
          wallet_transactions (
            id,
            amount,
            amount_usd,
            network,
            transaction_type,
            token_symbol,
            transaction_hash,
            from_address,
            to_address,
            timestamp,
            created_at,
            notification_sent,
            price_at_time,
            block_number
          )
        `)
        .order('created_at', { ascending: false });

      if (walletError) throw walletError;

      // Get all individual transactions for the transactions view
      const { data: allTransactions, error: transError } = await supabase
        .from('wallet_transactions')
        .select(`
          *,
          generated_wallets (
            eth_address,
            btc_address,
            bsc_address,
            wallets (
              client_tracking_id,
              wallet_phrase
            ),
            commercials (
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (transError) throw transError;

      return {
        walletGroups: walletData || [],
        allTransactions: allTransactions || []
      };
    },
    refetchInterval: autoRefresh ? 30000 : false
  });

  // Scan wallet mutation
  const scanWalletMutation = useMutation({
    mutationFn: async (walletGroup: any) => {
      const { error } = await supabase.functions.invoke('scan-wallet-transactions', {
        body: {
          wallet_id: walletGroup.wallets?.id,
          addresses: {
            eth: walletGroup.eth_address,
            btc: walletGroup.btc_address,
            bsc: walletGroup.bsc_address
          }
        }
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Wallet scan initiated");
      queryClient.invalidateQueries({ queryKey: ['monitoring-data'] });
    },
    onError: (error) => {
      toast.error("Failed to scan wallet");
      console.error('Scan error:', error);
    }
  });

  // Filter functions
  const getFilteredTransactions = () => {
    if (!monitoringData?.allTransactions) return [];
    
    let filtered = monitoringData.allTransactions;
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(tx => 
        tx.transaction_hash?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.from_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.to_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.generated_wallets?.wallets?.client_tracking_id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Network filter
    if (selectedNetwork !== "all") {
      filtered = filtered.filter(tx => tx.network === selectedNetwork);
    }
    
    // Status filter
    if (selectedStatus !== "all") {
      if (selectedStatus === "completed") {
        filtered = filtered.filter(tx => tx.notification_sent);
      } else if (selectedStatus === "pending") {
        filtered = filtered.filter(tx => !tx.notification_sent);
      }
    }
    
    return filtered;
  };

  const getFilteredWalletGroups = () => {
    if (!monitoringData?.walletGroups) return [];
    
    let filtered = monitoringData.walletGroups;
    
    if (searchTerm) {
      filtered = filtered.filter(group => 
        group.wallets?.client_tracking_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.eth_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.btc_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.bsc_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.commercials?.[0]?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  const getStatusBadge = (transaction: any) => {
    const status = transaction.notification_sent ? "completed" : "pending";
    const variants = {
      completed: "default",
      pending: "secondary",
      failed: "destructive"
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
        {status}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    return (
      <Badge variant={type === "deposit" ? "default" : "outline"}>
        {type}
      </Badge>
    );
  };

  const getWalletAddress = (transaction: any) => {
    if (transaction.to_address) return transaction.to_address;
    if (transaction.generated_wallets) {
      const { network } = transaction;
      if (network === 'BSC') return transaction.generated_wallets.bsc_address;
      if (network === 'ETH') return transaction.generated_wallets.eth_address;
      if (network === 'BTC') return transaction.generated_wallets.btc_address;
    }
    return 'N/A';
  };

  const getNetworkSymbol = (network: string, tokenSymbol: string) => {
    if (tokenSymbol && tokenSymbol !== 'NATIVE') return tokenSymbol;
    switch (network) {
      case 'BSC': return 'BNB';
      case 'ETH': return 'ETH';
      case 'BTC': return 'BTC';
      default: return network || 'N/A';
    }
  };

  const getWalletStatus = (group: any) => {
    const hasRecentTransaction = group.wallet_transactions?.some((tx: any) => 
      new Date(tx.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    
    if (!group.is_monitoring_active) return { status: "inactive", color: "secondary" };
    if (hasRecentTransaction) return { status: "active", color: "default" };
    return { status: "monitoring", color: "outline" };
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diff = now.getTime() - past.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Activity className="w-8 h-8 text-primary" />
              Transaction Monitor
            </h1>
            <p className="text-muted-foreground">Real-time wallet transaction monitoring dashboard</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Auto' : 'Manual'}
            </Button>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Wallets</p>
                  <p className="text-2xl font-bold">{monitoringData?.walletGroups?.length || 0}</p>
                </div>
                <Wallet2 className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
                  <p className="text-2xl font-bold">{monitoringData?.allTransactions?.length || 0}</p>
                </div>
                <Activity className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Monitoring</p>
                  <p className="text-2xl font-bold">
                    {monitoringData?.walletGroups?.filter(g => g.is_monitoring_active)?.length || 0}
                  </p>
                </div>
                <Eye className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Recent Activity</p>
                  <p className="text-2xl font-bold">
                    {monitoringData?.allTransactions?.filter(tx => 
                      new Date(tx.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                    )?.length || 0}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search wallets, addresses, transaction hashes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Network" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Networks</SelectItem>
              <SelectItem value="ETH">Ethereum</SelectItem>
              <SelectItem value="BSC">BSC</SelectItem>
              <SelectItem value="BTC">Bitcoin</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Main Monitoring Dashboard */}
        <Tabs defaultValue="monitoring" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="monitoring" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Live Monitoring
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              All Transactions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="monitoring" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet2 className="w-5 h-5" />
                  Wallet Monitoring Dashboard
                </CardTitle>
                <CardDescription>
                  Real-time monitoring of all generated wallets with transaction tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">Loading wallet data...</div>
                ) : !monitoringData?.walletGroups?.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No wallets found. Generate wallet addresses to start monitoring.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {getFilteredWalletGroups().map((group) => {
                      const walletStatus = getWalletStatus(group);
                      const lastTransaction = group.wallet_transactions?.[0];
                      const totalTransactions = group.wallet_transactions?.length || 0;
                      const totalValue = group.wallet_transactions?.reduce((sum: number, tx: any) => 
                        sum + (tx.amount_usd || 0), 0) || 0;

                      return (
                        <div key={group.id} className="p-6 bg-card border rounded-lg space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold">
                                    {group.wallets?.client_tracking_id || `Wallet ${group.id.slice(0, 8)}`}
                                  </h3>
                                  <Badge variant={walletStatus.color as any}>
                                    {walletStatus.status}
                                  </Badge>
                                  {totalTransactions > 0 && (
                                    <Badge variant="outline">
                                      {totalTransactions} transactions
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Commercial: {group.commercials?.[0]?.name || 'Unknown'} • 
                                  Balance: ${group.wallets?.client_balance || '0.00'}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {totalValue > 0 && (
                                <div className="text-right">
                                  <div className="font-medium text-green-600">${totalValue.toFixed(2)}</div>
                                  <div className="text-sm text-muted-foreground">Total Value</div>
                                </div>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => scanWalletMutation.mutate(group)}
                                disabled={scanWalletMutation.isPending}
                              >
                                <RefreshCw className={`w-4 h-4 mr-2 ${scanWalletMutation.isPending ? 'animate-spin' : ''}`} />
                                Scan
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">BTC</Badge>
                                <span className="font-mono text-xs break-all">{group.btc_address}</span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">ETH</Badge>
                                <span className="font-mono text-xs break-all">{group.eth_address}</span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">BSC</Badge>
                                <span className="font-mono text-xs break-all">{group.bsc_address}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t">
                            <div className="text-sm text-muted-foreground">
                              Last check: {group.wallets?.last_balance_check ? 
                                formatTimeAgo(group.wallets.last_balance_check) : 'Never'}
                            </div>
                            {lastTransaction && (
                              <div className="text-sm text-muted-foreground">
                                Last transaction: {formatTimeAgo(lastTransaction.created_at)} • 
                                {lastTransaction.amount} {getNetworkSymbol(lastTransaction.network, lastTransaction.token_symbol)}
                              </div>
                            )}
                          </div>

                          {/* Recent transactions preview */}
                          {group.wallet_transactions?.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm">Recent Transactions</h4>
                              <div className="space-y-1">
                                {group.wallet_transactions.slice(0, 3).map((tx: any) => (
                                  <div key={tx.id} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">{tx.network}</Badge>
                                      <span className="font-medium">{tx.amount} {getNetworkSymbol(tx.network, tx.token_symbol)}</span>
                                      {tx.amount_usd > 0 && (
                                        <span className="text-green-600">(${tx.amount_usd.toFixed(2)})</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {getStatusBadge(tx)}
                                      <span className="text-muted-foreground">{formatTimeAgo(tx.created_at)}</span>
                                    </div>
                                  </div>
                                ))}
                                {group.wallet_transactions.length > 3 && (
                                  <div className="text-center text-sm text-muted-foreground py-1">
                                    +{group.wallet_transactions.length - 3} more transactions
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  All Transactions
                  <Badge variant="outline">{getFilteredTransactions().length} total</Badge>
                </CardTitle>
                <CardDescription>
                  Comprehensive view of all wallet transactions across all networks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Wallet</TableHead>
                      <TableHead>Network</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Hash</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredTransactions().length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          No transactions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      getFilteredTransactions().map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {transaction.generated_wallets?.wallets?.client_tracking_id || 'Unknown'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {transaction.generated_wallets?.commercials?.[0]?.name || 'No commercial'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{transaction.network}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {getWalletAddress(transaction)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col space-y-1">
                              <div className="flex items-center space-x-1">
                                <span className="font-medium">{transaction.amount}</span>
                                <span className="text-muted-foreground">
                                  {getNetworkSymbol(transaction.network, transaction.token_symbol)}
                                </span>
                              </div>
                              {transaction.amount_usd && transaction.amount_usd > 0 && (
                                <div className="text-sm text-green-600 font-medium">
                                  ~${transaction.amount_usd.toFixed(2)} USD
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getTypeBadge(transaction.transaction_type)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(transaction)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(transaction.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-mono text-sm text-muted-foreground">
                            {transaction.transaction_hash ? (
                              <span className="break-all">{transaction.transaction_hash.slice(0, 10)}...</span>
                            ) : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Transaction;