import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Wallet, Plus } from 'lucide-react';

const WalletEntry = () => {
  const [walletPhrases, setWalletPhrases] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!walletPhrases.trim()) {
      toast({
        title: "Error",
        description: "Please enter wallet phrases",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Parse the wallet phrases - split by lines and clean up
      const lines = walletPhrases.split('\n').filter(line => line.trim());
      const parsedWallets = [];

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        // Remove number prefix if present (e.g., "001: " or "1:")
        const phraseMatch = trimmedLine.match(/^\d+:\s*(.+)$/);
        let phrase = phraseMatch ? phraseMatch[1].trim() : trimmedLine;

        // Validate phrase (should have 12 or 24 words)
        const words = phrase.split(/\s+/);
        if (words.length === 12 || words.length === 24) {
          parsedWallets.push({
            wallet_phrase: phrase,
            status: 'available',
            is_used: false,
            client_balance: 0.00,
            monitoring_active: true
          });
        }
      }

      if (parsedWallets.length === 0) {
        toast({
          title: "Error",
          description: "No valid wallet phrases found. Please ensure each phrase has 12 or 24 words.",
          variant: "destructive",
        });
        return;
      }

      // Insert wallets in batches of 50
      const batchSize = 50;
      let insertedCount = 0;

      for (let i = 0; i < parsedWallets.length; i += batchSize) {
        const batch = parsedWallets.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from('wallets')
          .insert(batch);

        if (error) {
          throw error;
        }
        
        insertedCount += batch.length;
      }

      toast({
        title: "Success",
        description: `Successfully added ${insertedCount} wallet phrases`,
      });

      setWalletPhrases('');
    } catch (error: any) {
      console.error('Error adding wallets:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add wallet phrases",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Add Wallet Phrases
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Wallet Phrases
          </label>
          <Textarea
            placeholder="Enter wallet phrases, one per line. Numbers at the beginning are ignored.&#10;Example:&#10;001: ability copper donate random upgrade above accident arrange please paddle grace nerve&#10;002: ability system federal derive issue spike love equip depend ensure long banana"
            value={walletPhrases}
            onChange={(e) => setWalletPhrases(e.target.value)}
            rows={10}
            className="font-mono text-sm"
          />
          <p className="text-sm text-muted-foreground mt-2">
            Each wallet phrase should contain 12 or 24 words. Number prefixes (like "001:") will be automatically removed.
          </p>
        </div>

        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting || !walletPhrases.trim()}
          className="w-full"
        >
          <Plus className={`w-4 h-4 mr-2 ${isSubmitting ? 'animate-spin' : ''}`} />
          {isSubmitting ? 'Adding Wallets...' : 'Add Wallets'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default WalletEntry;