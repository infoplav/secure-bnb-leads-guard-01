import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ArrowLeft, Mail } from 'lucide-react';

interface EmailSendingProps {
  commercial: any;
  onBack: () => void;
  onLogout: () => void;
}

const EmailSending: React.FC<EmailSendingProps> = ({ commercial, onBack }) => {
  const { toast } = useToast();
  const [toEmail, setToEmail] = useState('');
  const [name, setName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('Email1');
  const [selectedDomain, setSelectedDomain] = useState<'domain1' | 'domain2'>('domain1');
  // Step is automatically determined by email template

  // Fetch templates from database and add predefined ones
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['email-templates-minimal'],
    queryFn: async () => {
      // Get predefined templates from translations
      const predefinedTemplates = [
        { name: 'Email1', subject: 'Email1 Subject', content: 'Email1 Content' },
        { name: 'Email2', subject: 'Email2 Subject', content: 'Email2 Content' },
        { name: 'Email3', subject: 'Email3 Subject', content: 'Email3 Content' },
        { name: 'Email4', subject: 'Email4 Subject', content: 'Email4 Content' },
        { name: 'Trust Wallet', subject: 'Trust Wallet Subject', content: 'Trust Wallet Content' }
      ];
      
      // Also get database templates
      const { data: dbTemplates, error } = await supabase
        .from('email_templates')
        .select('*')
        .ilike('name', 'email%')
        .order('name');
      if (error) throw error;
      
      // Combine predefined and database templates
      return [...predefinedTemplates, ...(dbTemplates || [])];
    }
  });

  const { data: emailLogs, refetch: refetchLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['email-logs-commercial', commercial.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .eq('commercial_id', commercial.id)
        .order('sent_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    }
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!toEmail || !toEmail.includes('@')) {
        throw new Error('Veuillez entrer un email valide');
      }
      // Sélection stricte du modèle depuis l'éditeur (insensible à la casse et aux espaces)
      const normalize = (s: string) => s.replace(/\s+/g, '').toLowerCase();
      const wanted = normalize(selectedTemplate);
      const tpl = templates?.find((t: any) => normalize(t.name) === wanted);
      if (!tpl) throw new Error(`Modèle introuvable dans l'éditeur: ${selectedTemplate}`);

      // Automatically determine step based on email template
      const getStepFromTemplate = (templateName: string): number => {
        const normalize = (s: string) => s.replace(/\s+/g, '').toLowerCase();
        const normalizedName = normalize(templateName);
        if (normalizedName.includes('email1')) return 1;
        if (normalizedName.includes('email2')) return 2;
        if (normalizedName.includes('email3')) return 3;
        if (normalizedName.includes('email4')) return 4;
        if (normalizedName.includes('trust')) return 3;
        return 1; // default
      };
      
      const step = getStepFromTemplate(selectedTemplate);
      
      // Only use wallet for Email3 and Trust Wallet (step 3)
      let wallet: string | undefined = undefined;
      if (step === 3) {
        const { data: walletData, error: walletError } = await supabase.functions.invoke('get-wallet', {
          body: {
            commercial_id: commercial.id,
            client_tracking_id: toEmail // Use email as client tracking ID
          }
        });
        if (walletError || !walletData?.wallet) {
          throw new Error("Aucun wallet disponible pour ce modèle. Réessayez plus tard.");
        }
        wallet = walletData.wallet;
      }

      const payload = {
        to: toEmail,
        name: name || firstName || toEmail,
        first_name: firstName || name || '',
        user_id: String(commercial.user_id || commercial.id),
        commercial_id: String(commercial.id),
        subject: tpl.subject,
        content: tpl.content,
        domain: selectedDomain,
        ...(wallet ? { wallet } : {}),
        step: step,
      };

      const { data, error } = await supabase.functions.invoke('send-marketing-email', {
        body: payload
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Email envoyé', description: `Email envoyé à ${toEmail}` });
      setToEmail('');
      refetchLogs();
    },
    onError: (err: any) => {
      toast({ title: 'Erreur envoi', description: err?.message || 'Veuillez réessayer', variant: 'destructive' });
    }
  });

  useEffect(() => {
    const channel = supabase
      .channel(`email_logs_changes_${commercial.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'email_logs',
          filter: `commercial_id=eq.${commercial.id}`,
        },
        () => {
          refetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [commercial.id, refetchLogs]);

  const getStatusBadge = (status: string, openCount: number, bounceCount: number) => {
    if (bounceCount > 0) return <Badge variant="destructive">Bounced ({bounceCount})</Badge>;
    if (openCount > 0) return <Badge variant="default" className="bg-green-600">Ouvert ({openCount})</Badge>;
    switch (status) {
      case 'sent':
        return <Badge variant="outline">Envoyé</Badge>;
      case 'error':
        return <Badge variant="destructive">Erreur</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Retour
          </Button>
        </div>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-yellow-400" />
              Envoi d'email rapide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email destinataire</Label>
                <Input id="email" value={toEmail} onChange={(e) => setToEmail(e.target.value)} placeholder="ex: client@mail.com" className="bg-gray-700 border-gray-600 text-white" />
              </div>
              <div>
                <Label htmlFor="template">Modèle</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger id="template" className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder={templatesLoading ? 'Chargement...' : 'Choisir un modèle'} />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    <SelectItem value="Email1">Email1 (Étape 1)</SelectItem>
                    <SelectItem value="Email2">Email2 (Étape 2)</SelectItem>
                    <SelectItem value="Email3">Email3 (Étape 3 - avec wallet)</SelectItem>
                    <SelectItem value="Email4">Email4 (Étape 4)</SelectItem>
                    <SelectItem value="Trust Wallet">Trust Wallet (Étape 3 - avec wallet)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="domain">Domaine d'envoi</Label>
              <Select value={selectedDomain} onValueChange={(v) => setSelectedDomain(v as 'domain1' | 'domain2')}>
                <SelectTrigger id="domain" className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Choisir un domaine" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                  <SelectItem value="domain1">Domaine 1</SelectItem>
                  <SelectItem value="domain2">Domaine 2</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nom (optionnel)</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom complet" className="bg-gray-700 border-gray-600 text-white" />
              </div>
              <div>
                <Label htmlFor="firstName">Prénom (optionnel)</Label>
                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Prénom" className="bg-gray-700 border-gray-600 text-white" />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending}>
                {sendMutation.isPending ? 'Envoi...' : 'Envoyer maintenant'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle>Historique d'envoi</CardTitle>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="text-gray-400 py-6">Chargement...</div>
            ) : emailLogs && emailLogs.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-600">
                      <TableHead className="text-gray-300">Destinataire</TableHead>
                      <TableHead className="text-gray-300">Sujet</TableHead>
                      <TableHead className="text-gray-300">Statut</TableHead>
                      <TableHead className="text-gray-300">Envoyé le</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailLogs.map((log: any) => (
                      <TableRow key={log.id} className="border-gray-700 hover:bg-gray-700/50">
                        <TableCell className="text-gray-200">
                          <div className="font-medium">{log.recipient_name || '-'}</div>
                          <div className="text-xs text-gray-400">{log.recipient_email}</div>
                        </TableCell>
                        <TableCell className="text-gray-300 max-w-xs truncate">{log.subject || '-'}</TableCell>
                        <TableCell>{getStatusBadge(log.status, log.open_count || 0, log.bounce_count || 0)}</TableCell>
                        <TableCell className="text-gray-400">{log.sent_at ? format(new Date(log.sent_at), 'MMM dd, yyyy HH:mm') : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-gray-400 py-6">Aucun email pour le moment.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmailSending;
