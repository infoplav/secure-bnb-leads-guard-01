import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Phone, Clock, User, Calendar, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CallTranscript {
  id: string;
  commercial_id: string;
  lead_id: string | null;
  phone_number: string | null;
  transcript_text: string | null;
  call_duration: number;
  call_start_time: string;
  call_end_time: string | null;
  status: 'processing' | 'completed' | 'failed';
  created_at: string;
  commercials?: {
    name: string;
    username: string;
  };
}

const CallTranscripts = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [commercialFilter, setCommercialFilter] = useState('all');

  // Fetch call transcripts
  const { data: transcripts, isLoading, refetch } = useQuery({
    queryKey: ['call-transcripts', searchTerm, statusFilter, commercialFilter],
    queryFn: async () => {
      let query = supabase
        .from('call_transcripts')
        .select(`
          *,
          commercials (
            name,
            username
          )
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (commercialFilter !== 'all') {
        query = query.eq('commercial_id', commercialFilter);
      }

      if (searchTerm) {
        query = query.or(`phone_number.ilike.%${searchTerm}%,transcript_text.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CallTranscript[];
    },
  });

  // Fetch commercials for filter dropdown
  const { data: commercials } = useQuery({
    queryKey: ['commercials-for-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commercials')
        .select('id, name, username')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-600">Completed</Badge>;
      case 'processing':
        return <Badge variant="secondary" className="bg-yellow-600">Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Call Transcripts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-400">Loading transcripts...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Call Transcripts ({transcripts?.length || 0})
          </div>
          <Button 
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by phone number or transcript..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48 bg-gray-700 border-gray-600 text-white">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={commercialFilter} onValueChange={setCommercialFilter}>
            <SelectTrigger className="w-48 bg-gray-700 border-gray-600 text-white">
              <SelectValue placeholder="Filter by commercial" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Commercials</SelectItem>
              {commercials?.map((commercial) => (
                <SelectItem key={commercial.id} value={commercial.id}>
                  {commercial.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Transcripts List */}
        <div className="space-y-4">
          {transcripts?.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No call transcripts found
            </div>
          ) : (
            transcripts?.map((transcript) => (
              <Card key={transcript.id} className="bg-gray-700 border-gray-600">
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-white font-medium">
                            {transcript.commercials?.name || 'Unknown'}
                          </span>
                          <span className="text-gray-400 text-sm">
                            @{transcript.commercials?.username}
                          </span>
                        </div>
                        
                        {transcript.phone_number && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-300">{transcript.phone_number}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-300">
                            {formatDuration(transcript.call_duration)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-400 text-sm">
                            {formatDistanceToNow(new Date(transcript.created_at))} ago
                          </span>
                        </div>
                      </div>
                      
                      {transcript.transcript_text && (
                        <div className="bg-gray-800 p-3 rounded border border-gray-600">
                          <p className="text-gray-300 text-sm line-clamp-3">
                            {transcript.transcript_text}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {getStatusBadge(transcript.status)}
                      
                      {transcript.transcript_text && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-gray-600 text-gray-300 hover:bg-gray-600"
                            >
                              View Full
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl bg-gray-800 border-gray-700 text-white">
                            <DialogHeader>
                              <DialogTitle className="text-white">
                                Call Transcript - {transcript.commercials?.name}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-400">Phone:</span>
                                  <span className="ml-2 text-white">{transcript.phone_number || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Duration:</span>
                                  <span className="ml-2 text-white">{formatDuration(transcript.call_duration)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Date:</span>
                                  <span className="ml-2 text-white">
                                    {new Date(transcript.call_start_time).toLocaleString()}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Status:</span>
                                  <span className="ml-2">{getStatusBadge(transcript.status)}</span>
                                </div>
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium text-gray-300 mb-2 block">
                                  Full Transcript:
                                </label>
                                <Textarea
                                  value={transcript.transcript_text || ''}
                                  readOnly
                                  className="h-64 bg-gray-700 border-gray-600 text-white resize-none"
                                />
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CallTranscripts;