import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings, History, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";

interface TransferSetting {
  id: string;
  network: string;
  main_wallet_address: string;
  gas_limit: number;
  minimum_amount_usd: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface TransferRequest {
  id: string;
  wallet_address: string;
  network: string;
  amount: number;
  balance: number;
  amount_usd?: number;
  status: string;
  transaction_hash?: string;
  created_at: string;
  approved_at?: string;
  executed_at?: string;
  commercials?: {
    name: string;
  };
}

const Transfer = () => {
  const [settings, setSettings] = useState<TransferSetting[]>([]);
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('transfer-config', {
        method: 'GET'
      });

      if (error) throw error;
      setSettings(data.settings || []);
    } catch (error) {
      console.error('Error fetching transfer settings:', error);
      toast({
        title: "Error",
        description: "Failed to load transfer settings",
        variant: "destructive",
      });
    }
  };

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('transfer_requests')
        .select(`
          *,
          commercials (
            name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching transfer requests:', error);
      toast({
        title: "Error",
        description: "Failed to load transfer requests",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchSettings(), fetchRequests()]);
      setLoading(false);
    };

    fetchData();
  }, []);

  const updateSetting = async (network: string, updates: Partial<TransferSetting>) => {
    setSaving(network);
    try {
      const { data, error } = await supabase.functions.invoke('transfer-config', {
        method: 'POST',
        body: {
          network,
          ...updates
        }
      });

      if (error) throw error;

      await fetchSettings();
      toast({
        title: "Success",
        description: `${network} settings updated successfully`,
      });
    } catch (error) {
      console.error('Error updating setting:', error);
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  const handleApproveReject = async (requestId: string, action: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('transfer_requests')
        .update({ 
          status: action,
          approved_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      if (action === 'approved') {
        // Execute the transfer
        const { error: executeError } = await supabase.functions.invoke('execute-transfer', {
          body: { transfer_request_id: requestId }
        });

        if (executeError) {
          console.error('Error executing transfer:', executeError);
          toast({
            title: "Transfer Error",
            description: "Transfer approved but execution failed",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Transfer Approved",
            description: "Transfer has been approved and executed",
          });
        }
      } else {
        toast({
          title: "Transfer Rejected",
          description: "Transfer has been rejected",
        });
      }

      await fetchRequests();
    } catch (error) {
      console.error('Error updating transfer request:', error);
      toast({
        title: "Error",
        description: "Failed to update transfer request",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Auto-Transfer Management</h1>
        <Badge variant="outline" className="text-sm">
          Telegram Approval System
        </Badge>
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Network Settings
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Transfer Requests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <div className="grid gap-6">
            {settings.map((setting) => (
              <Card key={setting.network}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{setting.network} Network</span>
                    <Switch
                      checked={setting.enabled}
                      onCheckedChange={(enabled) => 
                        updateSetting(setting.network, { ...setting, enabled })
                      }
                      disabled={saving === setting.network}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor={`wallet-${setting.network}`}>Main Wallet Address</Label>
                    <Input
                      id={`wallet-${setting.network}`}
                      value={setting.main_wallet_address}
                      onChange={(e) => {
                        const updatedSettings = settings.map(s => 
                          s.network === setting.network 
                            ? { ...s, main_wallet_address: e.target.value }
                            : s
                        );
                        setSettings(updatedSettings);
                      }}
                      placeholder="0x..."
                      className="font-mono text-sm"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`gas-${setting.network}`}>Gas Limit</Label>
                      <Input
                        id={`gas-${setting.network}`}
                        type="number"
                        value={setting.gas_limit}
                        onChange={(e) => {
                          const updatedSettings = settings.map(s => 
                            s.network === setting.network 
                              ? { ...s, gas_limit: parseInt(e.target.value) }
                              : s
                          );
                          setSettings(updatedSettings);
                        }}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor={`min-${setting.network}`}>Minimum Amount (USD)</Label>
                      <Input
                        id={`min-${setting.network}`}
                        type="number"
                        step="0.01"
                        value={setting.minimum_amount_usd}
                        onChange={(e) => {
                          const updatedSettings = settings.map(s => 
                            s.network === setting.network 
                              ? { ...s, minimum_amount_usd: parseFloat(e.target.value) }
                              : s
                          );
                          setSettings(updatedSettings);
                        }}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={() => updateSetting(setting.network, setting)}
                    disabled={saving === setting.network}
                    className="w-full"
                  >
                    {saving === setting.network ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Settings'
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Transfer Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Network</TableHead>
                      <TableHead>Wallet</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>USD Value</TableHead>
                      <TableHead>Commercial</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(request.status)}
                            <Badge className={getStatusColor(request.status)}>
                              {request.status.toUpperCase()}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{request.network}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {request.wallet_address.slice(0, 8)}...{request.wallet_address.slice(-6)}
                        </TableCell>
                        <TableCell>
                          {request.amount.toFixed(6)} {request.network}
                        </TableCell>
                        <TableCell>
                          ${request.amount_usd?.toFixed(2) || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {request.commercials?.name || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {new Date(request.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {request.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApproveReject(request.id, 'approved')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApproveReject(request.id, 'rejected')}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                          {request.transaction_hash && (
                            <Badge variant="outline" className="font-mono text-xs">
                              {request.transaction_hash.slice(0, 8)}...
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {requests.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No transfer requests found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Transfer;