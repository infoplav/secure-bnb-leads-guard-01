import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Mail, Eye, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

interface EmailLog {
  id: string;
  tracking_code: string;
  recipient_email: string;
  recipient_name: string;
  contact_id: string;
  user_id: string;
  template_id: string;
  subject: string;
  status: string;
  sent_at: string;
  opened_at: string | null;
  open_count: number;
  resend_id: string;
  commercial_id: string;
  bounce_count: number;
  bounce_reason: string | null;
  bounce_at: string | null;
  commercials?: {
    name: string;
    username: string;
  } | null;
}

const EmailLogsViewer = () => {
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch email logs
  const { data: emailLogs, isLoading, error, refetch } = useQuery<EmailLog[]>({
    queryKey: ['email-logs', searchTerm],
    queryFn: async (): Promise<EmailLog[]> => {
      console.log('Fetching email logs...');
      try {
        // Try fetching email logs with a simpler approach
        const { data: emailData, error: emailError } = await supabase
          .from('email_logs')
          .select('*')
          .order('sent_at', { ascending: false })
          .limit(50);

        if (emailError) {
          console.error('Email logs query error:', emailError);
          throw emailError;
        }

        console.log('Email logs fetched successfully:', emailData?.length || 0, 'records');

        // If we have email data, try to fetch and attach commercial info
        if (emailData && emailData.length > 0) {
          const commercialIds = [...new Set(emailData.map(email => email.commercial_id).filter(Boolean))];
          
          const { data: commercialsData, error: commercialsError } = await supabase
            .from('commercials')
            .select('id, name, username')
            .in('id', commercialIds);

          if (commercialsError) {
            console.warn('Could not fetch commercials data:', commercialsError);
          }

          // Map commercials data to emails
          const commercialsMap = new Map(commercialsData?.map(c => [c.id, c]) || []);
          
          const enrichedData: EmailLog[] = emailData.map(email => ({
            ...email,
            commercials: email.commercial_id ? commercialsMap.get(email.commercial_id) || null : null
          }));

          console.log('Enriched email data:', enrichedData.length, 'records with commercial info');
          return enrichedData;
        }

        return (emailData || []).map(email => ({ ...email, commercials: null }));
      } catch (error) {
        console.error('Failed to fetch email logs:', error);
        throw error;
      }
    },
  });

  const getStatusBadge = (status: string, openCount: number, bounceCount: number) => {
    if (bounceCount > 0) {
      return <Badge variant="destructive">Bounced ({bounceCount})</Badge>;
    }
    if (openCount > 0) {
      return <Badge variant="default" className="bg-green-600">Opened ({openCount})</Badge>;
    }
    switch (status) {
      case 'sent':
        return <Badge variant="outline">Sent</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'bounced':
        return <Badge variant="destructive">Bounced</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Mail className="h-5 w-5" />
          Email Activity Logs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by email, name, or tracking code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center text-gray-400 py-8">Loading email logs...</div>
          ) : error ? (
            <div className="text-center text-red-400 py-8">
              Error loading email logs: {error instanceof Error ? error.message : 'Unknown error'}
            </div>
          ) : emailLogs?.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              {searchTerm ? 'No email logs found for this search.' : 'No email logs found.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-600 hover:bg-gray-700">
                    <TableHead className="text-gray-300">Tracking Code</TableHead>
                    <TableHead className="text-gray-300">Recipient</TableHead>
                    <TableHead className="text-gray-300">Commercial</TableHead>
                    <TableHead className="text-gray-300">Subject</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Bounce Info</TableHead>
                    <TableHead className="text-gray-300">Sent At</TableHead>
                    <TableHead className="text-gray-300">Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emailLogs?.map((log) => (
                    <TableRow key={log.id} className="border-gray-600 hover:bg-gray-700">
                      <TableCell className="text-gray-300 font-mono text-sm">
                        {log.tracking_code}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        <div>
                          <div className="font-medium">{log.recipient_name}</div>
                          <div className="text-sm text-gray-400">{log.recipient_email}</div>
                        </div>
                      </TableCell>
                       <TableCell className="text-gray-300">
                         {log.commercials ? (
                           <div>
                             <div className="font-medium">{log.commercials.name}</div>
                             <div className="text-sm text-gray-400">@{log.commercials.username}</div>
                           </div>
                         ) : (
                           <span className="text-gray-500">ID: {log.commercial_id}</span>
                         )}
                       </TableCell>
                      <TableCell className="text-gray-300 max-w-xs truncate">
                        {log.subject}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(log.status, log.open_count, log.bounce_count)}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {log.bounce_count > 0 ? (
                          <div className="text-red-400">
                            <div className="text-sm font-medium">Bounced</div>
                            {log.bounce_reason && (
                              <div className="text-xs text-gray-400">{log.bounce_reason}</div>
                            )}
                            {log.bounce_at && (
                              <div className="text-xs text-gray-500">
                                {format(new Date(log.bounce_at), 'MMM dd, HH:mm')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {format(new Date(log.sent_at), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        {log.commercial_id && (
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-gray-700 px-2 py-1 rounded">
                              api.bnbsafeguard.com/?={log.commercial_id}
                            </code>
                            <ExternalLink className="h-3 w-3 text-gray-400" />
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EmailLogsViewer;