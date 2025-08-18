import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Wrench, CheckCircle } from 'lucide-react';

const BackfillCommercialNames = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const runBackfill = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('backfill-commercial-names');

      if (error) throw error;

      setResult(data);
      toast({
        title: "Backfill Complete",
        description: `Updated ${data.updatedCount} user leads with commercial names`,
      });
    } catch (error) {
      console.error('Backfill error:', error);
      toast({
        title: "Backfill Error", 
        description: "Failed to run backfill process",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Wrench className="h-5 w-5" />
          Backfill Commercial Names
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-gray-400">
            This will update existing user leads that are missing commercial name attribution
            by matching them with email logs based on timing.
          </p>
          
          <Button 
            onClick={runBackfill}
            disabled={isRunning}
            className="w-full"
          >
            {isRunning ? 'Running Backfill...' : 'Run Backfill Process'}
          </Button>

          {result && (
            <div className="bg-green-900/50 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-sm text-green-300">
                  <strong>Success!</strong> Processed {result.processedLeads} leads, 
                  updated {result.updatedCount} with commercial names.
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BackfillCommercialNames;