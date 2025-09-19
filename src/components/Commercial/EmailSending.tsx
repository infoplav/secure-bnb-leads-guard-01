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
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  // Step is automatically determined by email template

  // Fetch all available templates
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['email-templates-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*');
      if (error) throw error;
      
      // Sort numerically by extracting number from name, with Trust Wallet templates at the end
      return data?.sort((a, b) => {
        const isTrustA = a.name.toLowerCase().includes('trust');
        const isTrustB = b.name.toLowerCase().includes('trust');
        
        // Trust Wallet templates go to the end
        if (isTrustA && !isTrustB) return 1;
        if (!isTrustA && isTrustB) return -1;
        if (isTrustA && isTrustB) return a.name.localeCompare(b.name);
        
        // Regular numerical sorting for non-Trust templates
        const numA = parseInt(a.name.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.name.match(/\d+/)?.[0] || '0');
        return numA - numB;
      }) || [];
    }
  });

  // Set default template when templates are loaded
  useEffect(() => {
    if (templates && templates.length > 0 && !selectedTemplate) {
      setSelectedTemplate(templates[0].name);
    }
  }, [templates, selectedTemplate]);

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
        if (normalizedName.includes('email3') || normalizedName.includes('trustwallet')) return 3;
        if (normalizedName.includes('email4')) return 4;
        return 1; // default
      };
      
      const step = getStepFromTemplate(selectedTemplate);
      
      // Use wallet for Email3 (step 3) and Trust Wallet templates
      let wallet: string | undefined = undefined;
      if (step === 3 || selectedTemplate.toLowerCase().includes('trust')) {
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
                    {templates?.map((template: any) => (
                      <SelectItem key={template.id} value={template.name}>
                        {template.name} - {template.subject.substring(0, 50)}...
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Email Configuration Info */}
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm text-blue-300">
                <strong>Configuration d'envoi:</strong> {
                  commercial.email_domain_preference === 'alias' ? 
                    `Alias - ${commercial.email_alias_from || 'do_not_reply@mailersp2.binance.com'}` :
                  commercial.email_domain_preference === 'domain2' ? 
                    'Domaine 2 - mailersrp-2binance.com' : 
                    'Domaine 1 - mailersrp-1binance.com'
                }
              </p>
              <p className="text-xs text-blue-400 mt-1">
                Modifiez dans Configuration Email si nécessaire
              </p>
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
