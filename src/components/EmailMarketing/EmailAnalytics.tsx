import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Mail, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface EmailLog {
  id: string;
  tracking_id: string;
  recipient_email: string;
  recipient_name?: string;
  subject: string;
  status: string;
  open_count: number;
  bounce_count: number;
  bounce_reason?: string;
  sent_at: string;
  opened_at?: string;
  commercials?: { name: string };
  email_templates?: { name: string };
}

const EmailAnalytics = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [commercialFilter, setCommercialFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');
  
  const queryClient = useQueryClient();

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('email-analytics-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'email_logs'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['email-analytics'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Fetch email logs with analytics
  const { data: rawEmailLogs = [], isLoading } = useQuery({
    queryKey: ['email-analytics', searchTerm, statusFilter, commercialFilter, dateFilter],
    queryFn: async () => {
      let query = supabase
        .from('email_logs')
        .select(`
          *,
          commercials:commercial_id (name)
        `)
        .order('sent_at', { ascending: false });

      // Date filtering
      const now = new Date();
      switch (dateFilter) {
        case 'today':
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          query = query.gte('sent_at', startOfDay.toISOString());
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          query = query.gte('sent_at', weekAgo.toISOString());
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          query = query.gte('sent_at', monthAgo.toISOString());
          break;
      }

      // Apply other filters
      if (searchTerm) {
        query = query.or(`recipient_email.ilike.%${searchTerm}%,subject.ilike.%${searchTerm}%,tracking_id.ilike.%${searchTerm}%`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (commercialFilter !== 'all') {
        query = query.eq('commercial_id', commercialFilter);
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return (data || []) as EmailLog[];
    },
    refetchInterval: 30000 // Auto-refresh every 30 seconds
  });

  // Process the raw data
  const emailLogs = rawEmailLogs || [];

  // Calculate statistics
  const stats = {
    total: emailLogs.length,
    sent: emailLogs.filter(e => e.status === 'sent').length,
    opened: emailLogs.filter(e => e.open_count > 0).length,
    bounced: emailLogs.filter(e => e.bounce_count > 0).length,
    failed: emailLogs.filter(e => e.status === 'failed').length
  };

  const rates = {
    delivery: stats.total > 0 ? ((stats.sent / stats.total) * 100).toFixed(1) : '0',
    open: stats.sent > 0 ? ((stats.opened / stats.sent) * 100).toFixed(1) : '0',
    bounce: stats.total > 0 ? ((stats.bounced / stats.total) * 100).toFixed(1) : '0'
  };

  const getStatusBadge = (log: EmailLog) => {
    if (log.bounce_count > 0) {
      return <Badge variant="destructive">Bounced ({log.bounce_count})</Badge>;
    }
    if (log.open_count > 0) {
      return <Badge variant="default">Opened ({log.open_count})</Badge>;
    }
    switch (log.status) {
      case 'sent':
        return <Badge variant="secondary">Delivered</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="outline">{log.status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-primary" />
            Email Marketing Analytics
          </h1>
          <p className="text-muted-foreground">Monitor email campaign performance and delivery metrics</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Emails</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Mail className="w-8 h-8 text-primary opacity-60" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Delivery Rate</p>
                  <p className="text-2xl font-bold text-green-600">{rates.delivery}%</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600 opacity-60" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Open Rate</p>
                  <p className="text-2xl font-bold text-blue-600">{rates.open}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-600 opacity-60" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Bounce Rate</p>
                  <p className="text-2xl font-bold text-red-600">{rates.bounce}%</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600 opacity-60" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search emails, subjects, tracking IDs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 days</SelectItem>
                  <SelectItem value="month">Last 30 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Email Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Email Campaign Logs</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading email logs...</div>
            ) : emailLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No emails found matching your criteria</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Commercial</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Opened</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{log.recipient_email}</p>
                            {log.recipient_name && (
                              <p className="text-sm text-muted-foreground">{log.recipient_name}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{(log as any).commercials?.name || 'Custom'}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-xs">{log.subject}</p>
                          </div>
                        </TableCell>
                        <TableCell>{(log as any).commercials?.name || 'Unknown'}</TableCell>
                        <TableCell>{getStatusBadge(log)}</TableCell>
                        <TableCell className="text-sm">{formatDate(log.sent_at)}</TableCell>
                        <TableCell className="text-sm">
                          {log.opened_at ? formatDate(log.opened_at) : 'Not opened'}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-muted-foreground font-mono">
                            ID: {log.tracking_id.substring(0, 8)}...
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
    </div>
  );
};

export default EmailAnalytics;