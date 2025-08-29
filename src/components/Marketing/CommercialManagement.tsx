import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Trash2, UserPlus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from '@/utils/translations';

const CommercialManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [editingCommercial, setEditingCommercial] = useState<any>(null);
  const [deletingCommercial, setDeletingCommercial] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCommercialName, setNewCommercialName] = useState('');
  const [newCommercialUsername, setNewCommercialUsername] = useState('');
  const [newCommercialLanguage, setNewCommercialLanguage] = useState('fr');
  const [editName, setEditName] = useState('');
  const [editTelegramId, setEditTelegramId] = useState('');
  const [editAutoIncludeWallet, setEditAutoIncludeWallet] = useState(false);

  const { data: commercials, isLoading } = useQuery({
    queryKey: ['commercials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commercials')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const createCommercialMutation = useMutation({
    mutationFn: async ({ name, username, language }: { name: string; username: string; language: string }) => {
      const { data, error } = await supabase
        .from('commercials')
        .insert([{ name, username, language }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercials'] });
      setIsCreateDialogOpen(false);
      setNewCommercialName('');
      setNewCommercialUsername('');
      setNewCommercialLanguage('fr');
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
    mutationFn: async ({ id, name, telegram_id, auto_include_wallet }: { id: string; name: string; telegram_id?: string; auto_include_wallet?: boolean }) => {
      const { data, error } = await supabase
        .from('commercials')
        .update({ name, telegram_id, auto_include_wallet })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercials'] });
      setEditingCommercial(null);
      setEditName('');
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
      queryClient.invalidateQueries({ queryKey: ['commercials'] });
      setDeletingCommercial(null);
      toast({
        title: t('commercial.commercialDeleted'),
        description: t('commercial.commercialDeletedMessage')
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

  const handleEdit = (commercial: any) => {
    setEditingCommercial(commercial);
    setEditName(commercial.name);
    setEditTelegramId(commercial.telegram_id || '');
    setEditAutoIncludeWallet(commercial.auto_include_wallet || false);
  };

  const handleSaveEdit = () => {
    if (editingCommercial && editName.trim()) {
      updateCommercialMutation.mutate({
        id: editingCommercial.id,
        name: editName.trim(),
        telegram_id: editTelegramId.trim(),
        auto_include_wallet: editAutoIncludeWallet
      });
    }
  };

  const handleDelete = (commercial: any) => {
    setDeletingCommercial(commercial);
  };

  const confirmDelete = () => {
    if (deletingCommercial) {
      deleteCommercialMutation.mutate(deletingCommercial.id);
    }
  };

  const handleCreate = () => {
    if (newCommercialName.trim() && newCommercialUsername.trim()) {
      createCommercialMutation.mutate({
        name: newCommercialName.trim(),
        username: newCommercialUsername.trim(),
        language: newCommercialLanguage
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <p className="text-gray-400">{t('commercial.loadingCommercials')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">{t('commercial.management')}</CardTitle>
              <CardDescription className="text-gray-400">
                {t('commercial.managementDescription')}
              </CardDescription>
            </div>
            <Button 
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {t('commercial.newCommercial')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {commercials?.map((commercial) => (
              <div key={commercial.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div>
                  <h3 className="text-white font-medium">{commercial.name}</h3>
                  <p className="text-gray-400 text-sm">@{commercial.username}</p>
                  <p className="text-gray-500 text-xs">{t(`languages.${commercial.language}`)}</p>
                  {commercial.telegram_id && (
                    <p className="text-blue-400 text-xs">📱 Telegram: {commercial.telegram_id}</p>
                  )}
                  {commercial.auto_include_wallet && (
                    <p className="text-green-400 text-xs">🔐 Auto-include wallet: Activé</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(commercial)}
                    className="border-gray-600 text-gray-300 hover:bg-gray-600"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(commercial)}
                    className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {commercials?.length === 0 && (
              <p className="text-gray-400 text-center py-8">{t('commercial.noCommercialsFound')}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Commercial Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">{t('commercial.newCommercial')}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {t('commercial.createCommercial')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-300 block mb-2">{t('common.fullName')}</label>
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
              <label className="text-sm text-gray-300 block mb-2">{t('common.language')}</label>
              <Select value={newCommercialLanguage} onValueChange={setNewCommercialLanguage}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="fr">{t('languages.fr')}</SelectItem>
                  <SelectItem value="en">{t('languages.en')}</SelectItem>
                  <SelectItem value="de">{t('languages.de')}</SelectItem>
                  <SelectItem value="es">{t('languages.es')}</SelectItem>
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
              onClick={handleCreate}
              disabled={!newCommercialName.trim() || !newCommercialUsername.trim() || createCommercialMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
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
              <label className="text-sm text-gray-300 block mb-2">ID Telegram (optionnel)</label>
              <Input
                value={editTelegramId}
                onChange={(e) => setEditTelegramId(e.target.value)}
                placeholder="Ex: 1234567890"
                className="bg-gray-700 border-gray-600 text-white"
              />
              <p className="text-xs text-gray-400 mt-1">
                ID Telegram du commercial pour recevoir les notifications
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="autoIncludeWallet"
                checked={editAutoIncludeWallet}
                onCheckedChange={(checked) => setEditAutoIncludeWallet(checked as boolean)}
              />
              <label htmlFor="autoIncludeWallet" className="text-sm text-gray-300">
                Inclure automatiquement le wallet dans tous les emails
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
              onClick={handleSaveEdit}
              disabled={!editName.trim() || updateCommercialMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateCommercialMutation.isPending ? t('common.saving') : t('common.save')}
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
              {t('commercial.confirmDeleteMessage')} {deletingCommercial?.name}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="border-gray-600 text-gray-300 hover:bg-gray-600"
              onClick={() => setDeletingCommercial(null)}
            >
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteCommercialMutation.isPending}
            >
              {deleteCommercialMutation.isPending ? t('common.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CommercialManagement;