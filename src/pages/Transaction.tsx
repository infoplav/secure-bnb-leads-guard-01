import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, Activity, RefreshCw, Eye, Wallet2, Clock, Trash2, Play } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { AddressFixTool } from "@/components/CRM/AddressFixTool";
import { TriggerWalletScan } from "@/components/CRM/TriggerWalletScan";

const Transaction = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedWallets, setSelectedWallets] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  // Update time every minute for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Fetch unified monitoring data with wallet groups and their transactions
  const { data: monitoringData, isLoading, refetch } = useQuery({
    queryKey: ['monitoring-data'],
    queryFn: async () => {
      // Fetch ALL used wallets first to ensure we show complete data
      const [allUsedWalletsRes, gwRes, txRes, commercialsRes, scanStateRes, contactsRes, leadsRes] = await Promise.all([
        supabase
          .from('wallets')
          .select('id, wallet_phrase, client_tracking_id, status, used_at, last_balance_check, client_balance, used_by_commercial_id, monitoring_active')
          .eq('status', 'used'),
        supabase
          .from('generated_wallets')
          .select('id, eth_address, btc_address, bsc_address, created_at, is_monitoring_active, commercial_id, wallet_id, seed_phrase')
          .order('created_at', { ascending: false }),
        supabase
          .from('wallet_transactions')
          .select('id, amount, amount_usd, network, transaction_type, token_symbol, transaction_hash, from_address, to_address, timestamp, created_at, notification_sent, price_at_time, block_number, generated_wallet_id, commercial_id')
          .order('created_at', { ascending: false }),
        supabase
          .from('commercials')
          .select('id, name'),
        supabase
          .from('address_scan_state')
          .select('address, network, last_seen_at, commercial_id, generated_wallet_id')
          .eq('network', 'GLOBAL'),
        supabase
          .from('marketing_contacts')
          .select('id, email, name, first_name, commercial_id'),
        supabase
          .from('user_leads')
          .select('id, username, name, commercial_name')
      ]);

      if (allUsedWalletsRes.error) throw allUsedWalletsRes.error;
      if (gwRes.error) throw gwRes.error;
      if (txRes.error) throw txRes.error;
      if (commercialsRes.error) throw commercialsRes.error;
      if (scanStateRes.error) throw scanStateRes.error;
      if (contactsRes.error) throw contactsRes.error;
      if (leadsRes.error) throw leadsRes.error;

      const allUsedWallets = allUsedWalletsRes.data || [];
      const gwByWalletId = new Map((gwRes.data || []).map((gw: any) => [gw.wallet_id, gw]));
      const gwById = new Map((gwRes.data || []).map((g: any) => [g.id, g]));
      const commercialsMap = new Map((commercialsRes.data || []).map((c: any) => [c.id, c]));
      const scanStateByGwId = new Map((scanStateRes.data || []).map((s: any) => [s.generated_wallet_id, s]));
      const contactsByCommercial = new Map();
      (contactsRes.data || []).forEach((contact: any) => {
        if (!contactsByCommercial.has(contact.commercial_id)) {
          contactsByCommercial.set(contact.commercial_id, []);
        }
        contactsByCommercial.get(contact.commercial_id).push(contact);
      });
      const leadsByCommercial = new Map();
      (leadsRes.data || []).forEach((lead: any) => {
        const commercial = (commercialsRes.data || []).find((c: any) => c.name === lead.commercial_name);
        if (commercial) {
          if (!leadsByCommercial.has(commercial.id)) {
            leadsByCommercial.set(commercial.id, []);
          }
          leadsByCommercial.get(commercial.id).push(lead);
        }
      });

      const txByGwId = new Map();
      (txRes.data || []).forEach((tx: any) => {
        if (tx.generated_wallet_id) {
          if (!txByGwId.has(tx.generated_wallet_id)) {
            txByGwId.set(tx.generated_wallet_id, []);
          }
          txByGwId.get(tx.generated_wallet_id).push(tx);
        }
      });

      // Process ALL used wallets, creating wallet groups for each
      const walletGroups = allUsedWallets.map((wallet: any) => {
        const generatedWallet = gwByWalletId.get(wallet.id);
        const commercial = commercialsMap.get(wallet.used_by_commercial_id);
        const contact = (contactsByCommercial.get(wallet.used_by_commercial_id) || [])[0];
        const lead = (leadsByCommercial.get(wallet.used_by_commercial_id) || [])[0];
        const lastScanTime = generatedWallet ? scanStateByGwId.get(generatedWallet.id)?.last_seen_at : null;

        // Use client_tracking_id directly as the recipient email
        const displayEmail = wallet.client_tracking_id || 'Unknown';

        return {
          // Use generated wallet data if available, otherwise create placeholder structure
          id: generatedWallet?.id || `placeholder_${wallet.id}`,
          wallet_id: wallet.id,
          commercial_id: wallet.used_by_commercial_id,
          client_tracking_id: wallet.client_tracking_id,
          eth_address: generatedWallet?.eth_address || null,
          bsc_address: generatedWallet?.bsc_address || null,
          btc_address: generatedWallet?.btc_address || null,
          seed_phrase: generatedWallet?.seed_phrase || wallet.wallet_phrase,
          created_at: generatedWallet?.created_at || wallet.used_at,
          is_monitoring_active: generatedWallet?.is_monitoring_active ?? wallet.monitoring_active,
          _wallet: wallet,
          _commercial: commercial,
          _contact: contact,
          _lead: lead,
          _transactions: generatedWallet ? (txByGwId.get(generatedWallet.id) || []) : [],
          _lastScanTime: lastScanTime,
          _displayEmail: displayEmail,
          _hasEmail: displayEmail && displayEmail.includes('@'),
          _hasGeneratedWallet: !!generatedWallet
        };
      });

      // Get wallet monitoring status (Active: 0-12h, View-Only: 12-48h, Expired: 48h+)
      const now = new Date();
      const twelveHoursAgo = new Date(now.getTime() - (12 * 60 * 60 * 1000));
      const fortyEightHoursAgo = new Date(now.getTime() - (48 * 60 * 60 * 1000));
      
      // Add monitoring status to each wallet group
      const walletGroupsWithStatus = walletGroups.map((group: any) => {
        const usedAt = group._wallet?.used_at ? new Date(group._wallet.used_at) : null;
        let monitoringStatus = 'expired';
        let statusColor = 'destructive';
        
        if (usedAt) {
          if (usedAt > twelveHoursAgo) {
            monitoringStatus = 'active';
            statusColor = 'default';
          } else if (usedAt > fortyEightHoursAgo) {
            monitoringStatus = 'view-only';
            statusColor = 'secondary';
          }
        }
        
        return {
          ...group,
          _monitoringStatus: monitoringStatus,
          _statusColor: statusColor,
          _timeLeft: usedAt ? Math.max(0, twelveHoursAgo.getTime() - usedAt.getTime()) : 0
        };
      });
      
      // Filter active wallets (within 12-hour window)
      const activeUsedWallets = walletGroupsWithStatus.filter((group: any) => {
        return group._monitoringStatus === 'active';
      });

      const allTransactions = (txRes.data || []).map((tx: any) => {
        const g = tx.generated_wallet_id ? gwById.get(tx.generated_wallet_id) : undefined;
        const _wallet = g ? allUsedWallets.find(w => w.id === g.wallet_id) : undefined;
        const _commercial = tx.commercial_id
          ? commercialsMap.get(tx.commercial_id)
          : (g?.commercial_id ? commercialsMap.get(g.commercial_id) : undefined);
        return { ...tx, _walletGroup: g, _wallet, _commercial };
      });

      return { walletGroups: walletGroupsWithStatus, allTransactions, activeUsedWallets };
    },
    refetchInterval: false // Manual refresh only
  });

  // Helper: derive networks based on available addresses
  const deriveNetworks = (group: any) => {
    const nets: string[] = [];
    if (group.eth_address) nets.push('ETH');
    if (group.bsc_address) nets.push('BSC');
    if (group.btc_address) nets.push('BTC');
    return nets;
  };

  // Scan wallet mutation
  const scanWalletMutation = useMutation({
    mutationFn: async (walletGroup: any) => {
      const { error } = await supabase.functions.invoke('scan-wallet-transactions', {
        body: {
          wallet_addresses: [walletGroup.eth_address, walletGroup.btc_address, walletGroup.bsc_address].filter(Boolean),
          commercial_id: walletGroup.commercial_id,
          networks: deriveNetworks(walletGroup)
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

  // Monitor used wallets mutation (now scans 12-hour window)
  const monitorUsedWalletsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('monitor-used-wallets', {
        body: {}
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Active wallet monitoring initiated (12-hour window)");
      queryClient.invalidateQueries({ queryKey: ['monitoring-data'] });
    },
    onError: (error) => {
      toast.error("Failed to start active wallet monitoring");
      console.error('Monitor error:', error);
    }
  });

  // Scan all wallets mutation
  const scanAllWalletsMutation = useMutation({
    mutationFn: async () => {
      if (!monitoringData?.walletGroups?.length) return;
      
      const scanPromises = monitoringData.walletGroups
        .filter((group: any) => group._monitoringStatus === 'active')
        .map(group => 
          supabase.functions.invoke('scan-wallet-transactions', {
            body: {
              wallet_addresses: [group.eth_address, group.btc_address, group.bsc_address].filter(Boolean),
              commercial_id: group.commercial_id,
              networks: deriveNetworks(group)
            }
          })
        );
      
      await Promise.all(scanPromises);
    },
    onSuccess: () => {
      toast.success("Active wallets scan initiated");
      queryClient.invalidateQueries({ queryKey: ['monitoring-data'] });
    },
    onError: (error) => {
      toast.error("Failed to scan active wallets");
      console.error('Scan active error:', error);
    }
  });

  // Regenerate Bitcoin addresses mutation
  const regenerateBitcoinMutation = useMutation({
    mutationFn: async () => {
      console.log('Triggering Bitcoin address regeneration...');
      
      // First run the regeneration
      const { data: regenData, error: regenError } = await supabase.functions.invoke('regenerate-bitcoin-addresses');
      if (regenError) throw regenError;
      
      // Then process the address generation queue
      const { data: processData, error: processError } = await supabase.functions.invoke('wallet-address-processor');
      if (processError) throw processError;
      
      return { regenData, processData };
    },
    onSuccess: (data) => {
      console.log('Bitcoin regeneration completed:', data);
      const processed = data.processData?.processed || 0;
      toast.success(`Regenerated Bitcoin addresses for ${processed} wallets`);
      queryClient.invalidateQueries({ queryKey: ['monitoring-data'] });
    },
    onError: (error: any) => {
      console.error('Bitcoin regeneration failed:', error);
      toast.error(`Failed to regenerate Bitcoin addresses: ${error.message}`);
    },
  });

  // Scan last 5 wallets with full rescan
  const scanLastFiveFullMutation = useMutation({
    mutationFn: async () => {
      const groups = monitoringData?.walletGroups?.slice(0, 5) || [];
      for (const group of groups) {
        const { error } = await supabase.functions.invoke('scan-wallet-transactions', {
          body: {
            wallet_addresses: [group.eth_address, group.btc_address, group.bsc_address].filter(Boolean),
            commercial_id: group.commercial_id,
            networks: deriveNetworks(group),
            full_rescan: true
          }
        });
        if (error) throw error;
        // brief delay to avoid provider rate limits
        await new Promise(res => setTimeout(res, 2000));
      }
    },
    onSuccess: () => {
      toast.success("Full rescan started for last 5 wallets");
      queryClient.invalidateQueries({ queryKey: ['monitoring-data'] });
    },
    onError: (error) => {
      toast.error("Failed to start full rescan");
      console.error('Scan last 5 full error:', error);
    }
  });

  // Scan last 2 wallets with full rescan
  const scanLastTwoFullMutation = useMutation({
    mutationFn: async () => {
      const groups = monitoringData?.walletGroups?.slice(0, 2) || [];
      for (const group of groups) {
        const { error } = await supabase.functions.invoke('scan-wallet-transactions', {
          body: {
            wallet_addresses: [group.eth_address, group.btc_address, group.bsc_address].filter(Boolean),
            commercial_id: group.commercial_id,
            networks: deriveNetworks(group),
            full_rescan: true
          }
        });
        if (error) throw error;
        // brief delay to avoid provider rate limits
        await new Promise(res => setTimeout(res, 2000));
      }
    },
    onSuccess: () => {
      toast.success("Full rescan started for last 2 wallets");
      queryClient.invalidateQueries({ queryKey: ['monitoring-data'] });
    },
    onError: (error) => {
      toast.error("Failed to start full rescan for last 2");
      console.error('Scan last 2 full error:', error);
    }
  });

  // Delete wallet mutation
  const deleteWalletMutation = useMutation({
    mutationFn: async (walletGroup: any) => {
      // Delete related transactions first
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .delete()
        .eq('generated_wallet_id', walletGroup.id);

      if (txError) throw txError;

      // Delete the generated wallet
      const { error: gwError } = await supabase
        .from('generated_wallets')
        .delete()
        .eq('id', walletGroup.id);

      if (gwError) throw gwError;

      // If there's an associated wallet, set it back to available
      if (walletGroup.wallet_id) {
        const { error: walletError } = await supabase
          .from('wallets')
          .update({ 
            status: 'available', 
            used_by_commercial_id: null, 
            used_at: null,
            client_tracking_id: null,
            client_balance: 0
          })
          .eq('id', walletGroup.wallet_id);

        if (walletError) throw walletError;
      }
    },
    onSuccess: () => {
      toast.success("Wallet deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['monitoring-data'] });
    },
    onError: (error) => {
      toast.error("Failed to delete wallet");
      console.error('Delete error:', error);
    }
  });

  // Filter functions
  const getFilteredTransactions = () => {
    if (!monitoringData?.allTransactions) return [];
    
    let filtered = monitoringData.allTransactions;
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((tx: any) =>
        tx.transaction_hash?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.from_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.to_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx._wallet?.client_tracking_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx._walletGroup?.eth_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx._walletGroup?.btc_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx._walletGroup?.bsc_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx._commercial?.name?.toLowerCase().includes(searchTerm.toLowerCase())
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
      filtered = filtered.filter((group: any) => 
        group._wallet?.client_tracking_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.eth_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.btc_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.bsc_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group._commercial?.name?.toLowerCase().includes(searchTerm.toLowerCase())
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
    const gw = transaction._walletGroup;
    const network = transaction.network;
    if (gw) {
      if (network === 'BSC') return gw.bsc_address;
      if (network === 'ETH') return gw.eth_address;
      if (network === 'BTC') return gw.btc_address;
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
    // Use the new monitoring status from the processed data
    const status = group._monitoringStatus || 'expired';
    const statusColor = group._statusColor || 'destructive';
    
    const statusLabels = {
      'active': 'Active (Monitoring)',
      'view-only': 'View-Only (12-48h)',
      'expired': 'Expired (&gt;48h)'
    };
    
    return { 
      status: statusLabels[status as keyof typeof statusLabels] || status, 
      color: statusColor 
    };
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

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate remaining active monitoring time (12h) or view-only time (48h)
  const getMonitoringTimeLeft = (usedAt: string) => {
    if (!usedAt) return null;
    
    const usedDate = new Date(usedAt);
    const activeEndDate = new Date(usedDate.getTime() + (12 * 60 * 60 * 1000)); // 12 hours
    const totalEndDate = new Date(usedDate.getTime() + (48 * 60 * 60 * 1000)); // 48 hours
    const now = currentTime.getTime();
    
    // Check if still in active monitoring (0-12h)
    if (now < activeEndDate.getTime()) {
      const timeLeft = activeEndDate.getTime() - now;
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}min (Active)`;
    }
    
    // Check if in view-only period (12-48h)
    if (now < totalEndDate.getTime()) {
      const timeLeft = totalEndDate.getTime() - now;
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}min (View-Only)`;
    }
    
    return "Expired (&gt;48h)";
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
            <p className="text-muted-foreground">Manual wallet transaction monitoring - optimized for cost efficiency</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => monitorUsedWalletsMutation.mutate()}
              disabled={monitorUsedWalletsMutation.isPending}
            >
              <Wallet2 className={`w-4 h-4 mr-2 ${monitorUsedWalletsMutation.isPending ? 'animate-spin' : ''}`} />
              Scan Active Wallets (12h)
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => scanAllWalletsMutation.mutate()}
              disabled={scanAllWalletsMutation.isPending || !monitoringData?.walletGroups?.length}
            >
              <Activity className={`w-4 h-4 mr-2 ${scanAllWalletsMutation.isPending ? 'animate-spin' : ''}`} />
              Scan All Visible
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => regenerateBitcoinMutation.mutate()}
              disabled={regenerateBitcoinMutation.isPending}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${regenerateBitcoinMutation.isPending ? 'animate-spin' : ''}`} />
              Regen BTC
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => scanLastTwoFullMutation.mutate()}
              disabled={scanLastTwoFullMutation.isPending}
            >
              <Play className={`w-4 h-4 mr-2 ${scanLastTwoFullMutation.isPending ? 'animate-spin' : ''}`} />
              Full Scan Last 2
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => scanLastFiveFullMutation.mutate()}
              disabled={scanLastFiveFullMutation.isPending}
            >
              <Eye className={`w-4 h-4 mr-2 ${scanLastFiveFullMutation.isPending ? 'animate-spin' : ''}`} />
              Full Scan Last 5
            </Button>
          </div>
        </div>

        {/* Cost Monitoring Dashboard */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Monitoring &amp; API Usage</CardTitle>
            <CardDescription>Track API calls and estimated costs for transaction monitoring</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {monitoringData?.activeUsedWallets?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Active Wallets (12h)</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary">
                  {monitoringData?.walletGroups?.filter((g: any) => g._monitoringStatus === 'view-only').length || 0}
                </div>
                <p className="text-xs text-muted-foreground">View-Only (12-48h)</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">
                  {monitoringData?.walletGroups?.filter((g: any) => g._monitoringStatus === 'expired').length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Expired (&gt;48h)</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">
                  Manual Only
                </div>
                <p className="text-xs text-muted-foreground">Scan Mode</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">
                    {monitoringData?.walletGroups?.length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Total Wallets</p>
                </div>
                <Wallet2 className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">
                    {monitoringData?.allTransactions?.length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Total Transactions</p>
                </div>
                <Activity className="w-8 h-8 text-secondary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">
                    ${monitoringData?.allTransactions?.reduce((sum: number, tx: any) => sum + (tx.amount_usd || 0), 0).toFixed(2) || '0.00'}
                  </div>
                  <p className="text-xs text-muted-foreground">Total USD Value</p>
                </div>
                <Eye className="w-8 h-8 text-accent" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">
                    {monitoringData?.allTransactions?.filter((tx: any) => 
                      new Date(tx.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                    ).length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Last 24h</p>
                </div>
                <Clock className="w-8 h-8 text-warning" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by hash, address, client ID, or commercial..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
            <SelectTrigger className="w-[180px]">
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
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="monitoring" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="monitoring">Used Wallet Monitoring</TabsTrigger>
            <TabsTrigger value="transactions">All Transactions</TabsTrigger>
            <TabsTrigger value="fix-addresses">Fix Addresses</TabsTrigger>
          </TabsList>
          
          <TabsContent value="monitoring" className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm">Active (0-12h): Scanning available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-sm">View-Only (12-48h): Data visible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm">Expired (&gt;48h): Will be cleaned</span>
              </div>
            </div>
            <div className="grid gap-4">
              {getFilteredWalletGroups().filter((group: any) => {
                // Show only used wallets that are being monitored
                return group._wallet?.status === 'used' && 
                       group._wallet?.used_at && 
                       new Date(group._wallet.used_at) > new Date(Date.now() - (48 * 60 * 60 * 1000));
              }).map((group: any) => {
                const status = getWalletStatus(group);
                const timeLeft = group._wallet?.used_at ? getMonitoringTimeLeft(group._wallet.used_at) : null;
                
                return (
                  <Card key={group.id} className="border-l-4 border-l-primary">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Wallet2 className="w-6 h-6 text-primary" />
                          <div>
                            <CardTitle className="text-lg">
                              {group._displayEmail || 
                               group._contact?.email || 
                               group._lead?.username || 
                               `Wallet ${group.id.slice(0, 8)}`}
                            </CardTitle>
                            <CardDescription>
                              Commercial: {group._commercial?.name || 'Unknown'} | 
                              Networks: {deriveNetworks(group).join(', ')}
                              {!group._hasEmail && (
                                <span className="text-amber-600"> | ⚠️ No Email Found</span>
                              )}
                              {timeLeft && (
                                <> | <Clock className="w-3 h-3 inline mx-1" />Time left monitoring: {timeLeft}</>
                              )}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={status.color as any}>{status.status}</Badge>
                          {group._monitoringStatus === 'active' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => scanWalletMutation.mutate(group)}
                              disabled={scanWalletMutation.isPending}
                            >
                              <RefreshCw className={`w-4 h-4 mr-1 ${scanWalletMutation.isPending ? 'animate-spin' : ''}`} />
                              Scan Now
                            </Button>
                          )}
                          {group._monitoringStatus !== 'active' && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={true}
                              title="Scanning only available for active wallets (0-12h)"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Only
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Wallet?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete this wallet and all its transactions. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteWalletMutation.mutate(group)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                          {group.eth_address && (
                            <div>
                              <span className="font-medium">ETH:</span>
                              <p className="font-mono text-xs break-all">{group.eth_address}</p>
                            </div>
                          )}
                          {group.bsc_address && (
                            <div>
                              <span className="font-medium">BSC:</span>
                              <p className="font-mono text-xs break-all">{group.bsc_address}</p>
                            </div>
                          )}
                          {group.btc_address && (
                            <div>
                              <span className="font-medium">BTC:</span>
                              <p className="font-mono text-xs break-all">{group.btc_address}</p>
                            </div>
                          )}
                        </div>
                        
                        {group._lastScanTime && (
                          <div className="text-sm text-muted-foreground">
                            Last scan: {formatTimeAgo(group._lastScanTime)}
                          </div>
                        )}
                        
                        {group._transactions.length > 0 && (
                          <div className="mt-4">
                            <h4 className="font-semibold mb-2">Recent Transactions ({group._transactions.length})</h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {group._transactions.slice(0, 3).map((tx: any) => (
                                <div key={tx.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                                  <div className="flex items-center gap-2">
                                    {getTypeBadge(tx.transaction_type)}
                                    <Badge variant="outline">{tx.network}</Badge>
                                    <span className="text-sm font-mono">{tx.transaction_hash?.slice(0, 10)}...</span>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-semibold">
                                      {tx.amount?.toFixed(6)} {getNetworkSymbol(tx.network, tx.token_symbol)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      ${tx.amount_usd?.toFixed(2) || '0.00'}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              
              {getFilteredWalletGroups().filter((group: any) => {
                return group._wallet?.status === 'used' && 
                       group._wallet?.used_at && 
                       new Date(group._wallet.used_at) > new Date(Date.now() - (48 * 60 * 60 * 1000));
              }).length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Wallet2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Used Wallets Found</h3>
                    <p className="text-muted-foreground">
                      No wallets are currently in "used" status within the 48-hour monitoring window.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Transactions</CardTitle>
                <CardDescription>Complete transaction history across all monitored wallets</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">Loading transactions...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hash</TableHead>
                        <TableHead>Network</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>USD Value</TableHead>
                        <TableHead>Commercial</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                       {getFilteredTransactions().map((transaction: any) => (
                         <TableRow key={transaction.id}>
                           <TableCell className="font-mono text-xs">
                             {transaction.transaction_hash?.slice(0, 10)}...
                           </TableCell>
                           <TableCell>
                             <Badge variant="outline">{transaction.network}</Badge>
                           </TableCell>
                           <TableCell>{getTypeBadge(transaction.transaction_type)}</TableCell>
                           <TableCell className="text-xs">
                             {formatDateTime(transaction.timestamp || transaction.created_at)}
                           </TableCell>
                           <TableCell className="font-mono text-xs">
                             {transaction.from_address?.slice(0, 10)}...
                           </TableCell>
                           <TableCell className="font-mono text-xs">
                             {getWalletAddress(transaction)?.slice(0, 10)}...
                           </TableCell>
                           <TableCell>
                             {transaction.amount?.toFixed(6)} {getNetworkSymbol(transaction.network, transaction.token_symbol)}
                           </TableCell>
                            <TableCell className="font-semibold">
                              ${transaction.amount_usd?.toFixed(2) || '0.00'}
                            </TableCell>
                            <TableCell>{transaction._commercial?.name || 'Unknown'}</TableCell>
                            <TableCell className="text-xs">
                              {transaction._walletGroup?._displayEmail ||
                               transaction._wallet?.client_tracking_id ||
                               <span className="text-muted-foreground">No email</span>}
                            </TableCell>
                            <TableCell>{getStatusBadge(transaction)}</TableCell>
                         </TableRow>
                       ))}
                        {getFilteredTransactions().length === 0 && (
                          <TableRow>
                            <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                              No transactions found matching your filters
                            </TableCell>
                          </TableRow>
                        )}
                     </TableBody>
                   </Table>
                 )}
               </CardContent>
             </Card>
           </TabsContent>
           
           <TabsContent value="fix-addresses" className="space-y-4">
             <AddressFixTool />
             <TriggerWalletScan />
           </TabsContent>
         </Tabs>
       </div>
     </div>
   );
};

export default Transaction;