import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, UserPlus, RefreshCw, LogOut, Clock, User } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from '@/utils/translations';
import { formatDistanceToNow } from 'date-fns';

interface Commercial {
  id: string;
  name: string;
  username: string;
  status: string;
  last_activity: string;
  session_id?: string;
  is_forced_logout: boolean;
  balance?: number;
  total_earnings?: number;
  commission_rate?: number;
  telegram_id?: string;
  auto_include_wallet?: boolean;
  password?: string;
}

const CommercialManagementWithStatus = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [editingCommercial, setEditingCommercial] = useState<any>(null);
  const [deletingCommercial, setDeletingCommercial] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCommercialName, setNewCommercialName] = useState('');
  const [newCommercialUsername, setNewCommercialUsername] = useState('');
  const [newCommercialLanguage, setNewCommercialLanguage] = useState('fr');
  const [newCommissionRate, setNewCommissionRate] = useState(80);
  const [editName, setEditName] = useState('');
  const [editTelegramId, setEditTelegramId] = useState('');
  const [editAutoIncludeWallet, setEditAutoIncludeWallet] = useState(false);
  const [editPassword, setEditPassword] = useState('');
  const [editCommissionRate, setEditCommissionRate] = useState(80);

  const { data: commercials, isLoading } = useQuery({
    queryKey: ['commercials-with-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commercials')
        .select('*')
        .order('last_activity', { ascending: false });
      
      if (error) throw error;
      return data as Commercial[];
    },
  });

  const createCommercialMutation = useMutation({
    mutationFn: async ({ name, username, language, commission_rate }: { name: string; username: string; language: string; commission_rate: number }) => {
      const { data, error } = await supabase
        .from('commercials')
        .insert([{ name, username, language, commission_rate }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercials-with-status'] });
      setIsCreateDialogOpen(false);
      setNewCommercialName('');
      setNewCommercialUsername('');
      setNewCommercialLanguage('fr');
      setNewCommissionRate(80);
      toast({
        title: t('commercial.commercialCreated'),
        description: t('commercial.commercialCreatedMessage')
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const updateCommercialMutation = useMutation({
    mutationFn: async ({ id, name, telegram_id, auto_include_wallet, password, commission_rate }: { id: string; name: string; telegram_id?: string; auto_include_wallet?: boolean; password?: string; commission_rate?: number }) => {
      const updateData: any = { name, telegram_id, auto_include_wallet, commission_rate };
      if (password && password.trim()) {
        updateData.password = password.trim();
      }
      
      const { data, error } = await supabase
        .from('commercials')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercials-with-status'] });
      setEditingCommercial(null);
      setEditName('');
      setEditCommissionRate(80);
      toast({
        title: t('commercial.commercialUpdated'),
        description: t('commercial.commercialUpdatedMessage')
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const deleteCommercialMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('commercials')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercials-with-status'] });
      setDeletingCommercial(null);
      toast({
        title: "Commercial supprimé",
        description: "Le commercial a été supprimé avec succès."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const forceLogout = async (commercialId: string, commercialName: string) => {
    try {
      const { error } = await supabase.rpc('force_logout_commercial', {
        commercial_id: commercialId
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `${commercialName} has been logged out`
      });

      queryClient.invalidateQueries({ queryKey: ['commercials-with-status'] });
    } catch (error) {
      console.error('Error logging out commercial:', error);
      toast({
        title: "Error",
        description: "Failed to logout commercial",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string, lastActivity: string) => {
    if (status === 'online') {
      const activityDate = new Date(lastActivity);
      const now = new Date();
      const diffMinutes = (now.getTime() - activityDate.getTime()) / (1000 * 60);
      
      if (diffMinutes < 5) return 'bg-green-500';
      if (diffMinutes < 15) return 'bg-yellow-500';
      return 'bg-red-500';
    }
    return 'bg-gray-500';
  };

  const getStatusText = (status: string, lastActivity: string) => {
    if (status === 'online') {
      const activityDate = new Date(lastActivity);
      const now = new Date();
      const diffMinutes = (now.getTime() - activityDate.getTime()) / (1000 * 60);
      
      if (diffMinutes < 5) return 'Online';
      if (diffMinutes < 15) return 'Away';
      return 'Inactive';
    }
    return 'Offline';
  };

  const handleEdit = (commercial: Commercial) => {
    setEditingCommercial(commercial);
    setEditName(commercial.name);
    setEditTelegramId(commercial.telegram_id || '');
    setEditAutoIncludeWallet(commercial.auto_include_wallet || false);
    setEditCommissionRate(commercial.commission_rate || 80);
    setEditPassword('');
  };

  const refreshCommercials = () => {
    queryClient.invalidateQueries({ queryKey: ['commercials-with-status'] });
  };

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('commercial-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'commercials'
        },
        () => {
          refreshCommercials();
        }
      )
      .subscribe();

    // Refresh every 30 seconds
    const interval = setInterval(refreshCommercials, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [queryClient]);

  if (isLoading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Commercial Management & Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-gray-400">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-white">
              <User className="h-5 w-5" />
              Commercial Management & Status ({commercials?.length || 0})
            </CardTitle>
            <CardDescription className="text-gray-400">
              Manage commercials and monitor their real-time status
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshCommercials}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-yellow-600 hover:bg-yellow-700 text-black"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {t('commercial.newCommercial')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-600">
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Commercial</TableHead>
                  <TableHead className="text-gray-300">Balance</TableHead>
                  <TableHead className="text-gray-300">Commission</TableHead>
                  <TableHead className="text-gray-300">Last Activity</TableHead>
                  <TableHead className="text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commercials?.map((commercial) => (
                  <TableRow key={commercial.id} className="border-gray-600 hover:bg-gray-700/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${getStatusColor(
                            commercial.status,
                            commercial.last_activity
                          )}`}
                        />
                        <Badge variant="outline" className="text-xs">
                          {getStatusText(commercial.status, commercial.last_activity)}
                        </Badge>
                        {commercial.is_forced_logout && (
                          <Badge variant="destructive" className="text-xs">Forced Out</Badge>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div>
                        <div className="font-medium text-white">{commercial.name}</div>
                        <div className="text-sm text-gray-400">@{commercial.username}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div>
                        <div className="font-medium text-green-400">
                          ${commercial.balance?.toFixed(2) || '0.00'}
                        </div>
                        <div className="text-xs text-gray-400">
                          Total: ${commercial.total_earnings?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant="secondary">
                        {commercial.commission_rate || 80}%
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(commercial.last_activity))} ago
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(commercial)}
                          className="border-gray-600 text-gray-300 hover:bg-gray-700"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        
                        {commercial.status === 'online' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => forceLogout(commercial.id, commercial.name)}
                          >
                            <LogOut className="h-3 w-3" />
                          </Button>
                        )}
                        
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeletingCommercial(commercial)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {!commercials?.length && (
              <div className="text-center py-8 text-gray-400">
                No commercials found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Commercial Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">{t('commercial.createCommercial')}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {t('commercial.managementDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-300 block mb-2">{t('common.name')}</label>
              <Input
                value={newCommercialName}
                onChange={(e) => setNewCommercialName(e.target.value)}
                placeholder={`${t('common.name')}...`}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-gray-300 block mb-2">{t('common.username')}</label>
              <Input
                value={newCommercialUsername}
                onChange={(e) => setNewCommercialUsername(e.target.value)}
                placeholder={`${t('common.username')}...`}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-gray-300 block mb-2">Commission Rate</label>
              <Select value={newCommissionRate.toString()} onValueChange={(value) => setNewCommissionRate(parseInt(value))}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="80">80%</SelectItem>
                  <SelectItem value="65">65%</SelectItem>
                  <SelectItem value="40">40%</SelectItem>
                  <SelectItem value="20">20%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-300 block mb-2">{t('common.language')}</label>
              <Select value={newCommercialLanguage} onValueChange={setNewCommercialLanguage}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-600"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => createCommercialMutation.mutate({
                name: newCommercialName,
                username: newCommercialUsername,
                language: newCommercialLanguage,
                commission_rate: newCommissionRate
              })}
              disabled={!newCommercialName || !newCommercialUsername || createCommercialMutation.isPending}
              className="bg-yellow-600 hover:bg-yellow-700 text-black"
            >
              {createCommercialMutation.isPending ? t('common.creating') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Commercial Dialog */}
      <Dialog open={!!editingCommercial} onOpenChange={() => setEditingCommercial(null)}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">{t('commercial.editCommercial')}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {t('commercial.editCommercialDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-300 block mb-2">{t('common.name')}</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={`${t('common.name')}...`}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-gray-300 block mb-2">Commission Rate</label>
              <Select value={editCommissionRate.toString()} onValueChange={(value) => setEditCommissionRate(parseInt(value))}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="80">80%</SelectItem>
                  <SelectItem value="65">65%</SelectItem>
                  <SelectItem value="40">40%</SelectItem>
                  <SelectItem value="20">20%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-300 block mb-2">ID Telegram (optionnel)</label>
              <Input
                value={editTelegramId}
                onChange={(e) => setEditTelegramId(e.target.value)}
                placeholder="Ex: 1234567890"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-gray-300 block mb-2">Mot de passe (laisser vide pour ne pas changer)</label>
              <Input
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Nouveau mot de passe..."
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto-include-wallet"
                checked={editAutoIncludeWallet}
                onCheckedChange={(checked) => setEditAutoIncludeWallet(checked === true)}
                className="border-gray-600 data-[state=checked]:bg-blue-600"
              />
              <label htmlFor="auto-include-wallet" className="text-sm text-gray-300">
                Inclure la phrase secrète dans les notifications Telegram
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingCommercial(null)}
              className="border-gray-600 text-gray-300 hover:bg-gray-600"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => updateCommercialMutation.mutate({
                id: editingCommercial.id,
                name: editName,
                telegram_id: editTelegramId,
                auto_include_wallet: editAutoIncludeWallet,
                password: editPassword,
                commission_rate: editCommissionRate
              })}
              disabled={!editName || updateCommercialMutation.isPending}
              className="bg-yellow-600 hover:bg-yellow-700 text-black"
            >
              {updateCommercialMutation.isPending ? 'Updating...' : t('common.update')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingCommercial} onOpenChange={() => setDeletingCommercial(null)}>
        <AlertDialogContent className="bg-gray-800 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">{t('commercial.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {t('commercial.confirmDeleteMessage')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-600 text-gray-300 hover:bg-gray-600">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCommercialMutation.mutate(deletingCommercial.id)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CommercialManagementWithStatus;