import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface CommercialManualLeadFormProps {
  commercial: any;
  onSuccess?: () => void;
}

const CommercialManualLeadForm = ({ commercial, onSuccess }: CommercialManualLeadFormProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    first_name: '',
    email: '',
    phone: '',
    status: 'new',
    source: 'manual'
  });

  const addLeadMutation = useMutation({
    mutationFn: async (leadData: typeof formData) => {
      const { error } = await supabase
        .from('marketing_contacts')
        .insert([{
          ...leadData,
          commercial_id: commercial.id // Automatically assign to current commercial
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-leads', commercial.id] });
      setOpen(false);
      setFormData({
        name: '',
        first_name: '',
        email: '',
        phone: '',
        status: 'new',
        source: 'manual'
      });
      onSuccess?.();
      toast({
        title: "Succès",
        description: "Lead ajouté avec succès à vos contacts",
      });
    },
    onError: (error: any) => {
      console.error('Add lead error:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter le lead",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.first_name || !formData.email || !formData.phone) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    addLeadMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Ajouter un Lead
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Ajouter un Nouveau Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name" className="text-gray-300">
                Prénom *
              </Label>
              <Input
                id="first_name"
                type="text"
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                placeholder="Entrez le prénom"
                className="bg-gray-700 border-gray-600 text-white"
                required
              />
            </div>
            <div>
              <Label htmlFor="name" className="text-gray-300">
                Nom *
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Entrez le nom"
                className="bg-gray-700 border-gray-600 text-white"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email" className="text-gray-300">
              Email *
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Entrez l'adresse email"
              className="bg-gray-700 border-gray-600 text-white"
              required
            />
          </div>

          <div>
            <Label htmlFor="phone" className="text-gray-300">
              Téléphone *
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="Entrez le numéro de téléphone"
              className="bg-gray-700 border-gray-600 text-white"
              required
            />
          </div>

          <div>
            <Label className="text-gray-300">
              Status Initial
            </Label>
            <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="callback">To Call Back</SelectItem>
                <SelectItem value="interested">Interested</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-xs text-gray-400">
            Ce lead sera automatiquement assigné à: <strong>{commercial.name}</strong>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-600"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={addLeadMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {addLeadMutation.isPending ? 'Ajout en cours...' : 'Ajouter le Lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CommercialManualLeadForm;