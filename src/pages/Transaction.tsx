import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, Download, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const Transaction = () => {
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch wallet transactions grouped by wallet
  const { data: walletGroups = [], isLoading } = useQuery({
    queryKey: ['wallet-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('generated_wallets')
        .select(`
          *,
          wallets (
            wallet_phrase,
            client_tracking_id,
            status,
            used_at
          ),
          wallet_transactions (
            *
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  // Fetch individual transactions for the "All Transactions" tab
  const { data: allTransactions = [] } = useQuery({
    queryKey: ['all-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select(`
          *,
          wallets (
            wallet_phrase,
            client_tracking_id
          ),
          generated_wallets (
            bsc_address,
            btc_address,
            eth_address
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  const getStatusBadge = (transaction: any) => {
    // Determine status based on transaction data
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

  const renderTransactionTable = (transactions: any[]) => (
    <Table>
      <TableHeader>
        <TableRow>
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
        {transactions.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center">No transactions found</TableCell>
          </TableRow>
        ) : (
          transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>
                <Badge variant="outline">{transaction.network}</Badge>
              </TableCell>
              <TableCell className="font-mono text-sm">
                {getWalletAddress(transaction)}
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-1">
                  <span className="font-medium">{transaction.amount}</span>
                  <span className="text-muted-foreground">
                    {getNetworkSymbol(transaction.network, transaction.token_symbol)}
                  </span>
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
                {transaction.transaction_hash || 'N/A'}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Transactions</h1>
            <p className="text-muted-foreground">Monitor wallet transactions and transfers</p>
          </div>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>

        <div className="flex items-center space-x-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by wallet address or transaction hash..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              Loading wallets and transactions...
            </CardContent>
          </Card>
        ) : walletGroups.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No wallets with generated addresses found. Send an email with step 3+ to generate wallet addresses.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {walletGroups.map((wallet) => (
              <Card key={wallet.id} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Wallet className="w-5 h-5 text-primary" />
                      <div>
                        <CardTitle className="text-lg">
                          {wallet.client_tracking_id || `Wallet ${wallet.id.slice(0, 8)}`}
                        </CardTitle>
                        <CardDescription>
                          {wallet.wallets?.status === 'used' ? 'Active Wallet' : 'Available'} • 
                          Created {new Date(wallet.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={wallet.wallets?.status === 'used' ? 'default' : 'secondary'}>
                      {wallet.wallets?.status || 'unknown'}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    {/* Seed Phrase Display */}
                    <div className="p-3 bg-muted/30 rounded-lg border">
                      <div className="text-sm font-medium text-muted-foreground mb-2">Seed Phrase</div>
                      <div className="font-mono text-xs break-all text-foreground bg-background p-2 rounded border">
                        {wallet.wallets?.wallet_phrase || wallet.seed_phrase || "Not available"}
                      </div>
                    </div>

                    {/* Address Display */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="text-sm font-medium text-muted-foreground mb-1">BSC Network</div>
                        <div className="font-mono text-xs break-all">{wallet.bsc_address || "Not generated"}</div>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="text-sm font-medium text-muted-foreground mb-1">Ethereum Network</div>
                        <div className="font-mono text-xs break-all">{wallet.eth_address || "Not generated"}</div>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="text-sm font-medium text-muted-foreground mb-1">Bitcoin Network</div>
                        <div className="font-mono text-xs break-all">{wallet.btc_address || "Not generated"}</div>
                      </div>
                    </div>

                    {/* Transactions */}
                    <div>
                      <h4 className="text-sm font-medium mb-3">Recent Transactions</h4>
                      {wallet.wallet_transactions && wallet.wallet_transactions.length > 0 ? (
                        <div className="border rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Network</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Hash</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {wallet.wallet_transactions.slice(0, 5).map((transaction) => (
                                <TableRow key={transaction.id}>
                                  <TableCell>
                                    <Badge variant="outline">{transaction.network}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center space-x-1">
                                      <span className="font-medium">{transaction.amount}</span>
                                      <span className="text-muted-foreground">
                                        {getNetworkSymbol(transaction.network, transaction.token_symbol)}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {getTypeBadge(transaction.transaction_type)}
                                  </TableCell>
                                  <TableCell>
                                    {getStatusBadge(transaction)}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground text-sm">
                                    {new Date(transaction.created_at).toLocaleString()}
                                  </TableCell>
                                  <TableCell className="font-mono text-xs text-muted-foreground">
                                    {transaction.transaction_hash ? 
                                      transaction.transaction_hash.slice(0, 10) + "..." : 
                                      "Pending"
                                    }
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          {wallet.wallet_transactions.length > 5 && (
                            <div className="p-3 text-center border-t">
                              <Button variant="ghost" size="sm">
                                View {wallet.wallet_transactions.length - 5} more transactions
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                            <Search className="w-5 h-5" />
                          </div>
                          No transactions found for this wallet yet
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* All Transactions Overview */}
        {allTransactions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>All Recent Transactions</CardTitle>
              <CardDescription>
                Latest transactions across all wallets and networks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                {renderTransactionTable(allTransactions.slice(0, 10))}
                {allTransactions.length > 10 && (
                  <div className="p-3 text-center border-t">
                    <Button variant="ghost" size="sm">
                      View all {allTransactions.length} transactions
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Transaction;