import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Search, Calendar, Filter, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface EmailLog {
  id: string;
  tracking_code: string;
  recipient_email: string;
  recipient_name?: string;
  subject?: string;
  status: string;
  open_count: number;
  bounce_count: number;
  bounce_reason?: string;
  bounce_at?: string;
  sent_at?: string;
  opened_at?: string;
  commercial_id?: string;
  commercials?: {
    id: string;
    name: string;
  };
}

const EmailSending = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [commercialFilter, setCommercialFilter] = useState('all');
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Check if user is authenticated, redirect to login if not
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Fetch email logs with commercial information
  const { data: emailLogs = [], isLoading, error } = useQuery<EmailLog[]>({
    queryKey: ['email-logs', searchTerm, statusFilter, commercialFilter],
    queryFn: async () => {
      let query = supabase
        .from('email_logs')
        .select(`
          *,
          commercials:commercial_id (
            id,
            name
          )
        `)
        .order('sent_at', { ascending: false });

      // Apply filters
      if (searchTerm) {
        query = query.or(`recipient_email.ilike.%${searchTerm}%,subject.ilike.%${searchTerm}%,tracking_code.ilike.%${searchTerm}%`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (commercialFilter !== 'all') {
        query = query.eq('commercial_id', commercialFilter);
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: isAuthenticated,
  });

  // Fetch commercials for filter dropdown
  const { data: commercials = [] } = useQuery({
    queryKey: ['commercials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commercials')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: isAuthenticated,
  });

  const getStatusBadge = (status: string, openCount: number, bounceCount: number) => {
    if (bounceCount > 0) {
      return <Badge variant="destructive">Bounced</Badge>;
    }
    if (openCount > 0) {
      return <Badge variant="default">Opened ({openCount})</Badge>;
    }
    if (status === 'sent') {
      return <Badge variant="secondary">Delivered</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
    } catch {
      return 'Invalid date';
    }
  };

  // Statistics
  const totalEmails = emailLogs.length;
  const deliveredEmails = emailLogs.filter(email => email.status === 'sent' && email.bounce_count === 0).length;
  const openedEmails = emailLogs.filter(email => email.open_count > 0).length;
  const bouncedEmails = emailLogs.filter(email => email.bounce_count > 0).length;
  const deliveryRate = totalEmails > 0 ? ((deliveredEmails / totalEmails) * 100).toFixed(1) : '0';
  const openRate = deliveredEmails > 0 ? ((openedEmails / deliveredEmails) * 100).toFixed(1) : '0';
  const bounceRate = totalEmails > 0 ? ((bouncedEmails / totalEmails) * 100).toFixed(1) : '0';

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/admin')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Mail className="w-8 h-8 mr-3" />
              Email Campaign Analytics
            </h1>
            <p className="text-muted-foreground">Monitor email delivery, opens, and bounces</p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Emails</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmails}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveryRate}%</div>
            <p className="text-xs text-muted-foreground">{deliveredEmails} delivered</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openRate}%</div>
            <p className="text-xs text-muted-foreground">{openedEmails} opened</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{bounceRate}%</div>
            <p className="text-xs text-muted-foreground">{bouncedEmails} bounced</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <Input
                placeholder="Search by email, subject, or tracking code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={commercialFilter} onValueChange={setCommercialFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Commercial" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Commercials</SelectItem>
                {commercials.map((commercial) => (
                  <SelectItem key={commercial.id} value={commercial.id}>
                    {commercial.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Email Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Email Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">Loading email logs...</div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              Error loading email logs: {error.message}
            </div>
          ) : emailLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No email logs found matching your criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tracking Code</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Commercial</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Bounce Info</TableHead>
                    <TableHead>Sent At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emailLogs.map((email) => (
                    <TableRow key={email.id}>
                      <TableCell className="font-mono text-xs">
                        {email.tracking_code.split('_')[0].substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{email.recipient_email}</p>
                          {email.recipient_name && (
                            <p className="text-sm text-muted-foreground">{email.recipient_name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {email.commercials?.name || 'Unknown'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {email.subject || 'No subject'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(email.status, email.open_count, email.bounce_count)}
                      </TableCell>
                      <TableCell>
                        {email.bounce_count > 0 && (
                          <div className="text-sm">
                            <p className="text-destructive font-medium">
                              Bounced {email.bounce_count}x
                            </p>
                            {email.bounce_reason && (
                              <p className="text-xs text-muted-foreground truncate max-w-32">
                                {email.bounce_reason}
                              </p>
                            )}
                            {email.bounce_at && (
                              <p className="text-xs text-muted-foreground">
                                {formatDate(email.bounce_at)}
                              </p>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(email.sent_at)}
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

export default EmailSending;