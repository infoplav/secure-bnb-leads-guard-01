import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const Transaction = () => {
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch wallet transactions from database
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['wallet-transactions'],
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

        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              All wallet transactions across BSC, ETH, and BTC networks
            </CardDescription>
          </CardHeader>
          <CardContent>
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

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Wallet Address</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Transaction Hash</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                    </TableRow>
                  ) : transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">No transactions found</TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Transaction;