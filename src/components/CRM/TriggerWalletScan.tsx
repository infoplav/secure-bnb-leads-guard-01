import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Play, Loader2, CheckCircle } from "lucide-react";

export const TriggerWalletScan = () => {
  const [isScanning, setIsScanning] = useState(false);

  const handleTriggerScan = async () => {
    setIsScanning(true);
    try {
      console.log('🚀 Triggering wallet scan for corrected addresses...');
      
      // Get all generated wallet addresses
      const { data: wallets, error: walletError } = await supabase
        .from('generated_wallets')
        .select('eth_address, btc_address, bsc_address, commercial_id');
      
      if (walletError) {
        throw walletError;
      }

      if (!wallets || wallets.length === 0) {
        toast.warning("No wallets found to scan");
        return;
      }

      // Collect all addresses
      const allAddresses = wallets.flatMap(w => [
        w.eth_address, 
        w.btc_address, 
        w.bsc_address
      ]).filter(Boolean);

      console.log('🔍 Scanning addresses:', allAddresses);

      // Trigger the scan
      const { data, error } = await supabase.functions.invoke('scan-wallet-transactions', {
        body: {
          wallet_addresses: allAddresses,
          commercial_id: wallets[0]?.commercial_id,
          networks: ['ETH', 'BSC', 'BTC'],
          full_rescan: true
        }
      });

      if (error) {
        throw error;
      }

      toast.success(`Wallet scan completed! ${data?.stats?.transactions_found || 0} transactions found.`);
      console.log('✅ Scan completed:', data);
      
    } catch (error) {
      console.error('❌ Scan error:', error);
      toast.error(`Scan failed: ${error.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <Card className="border-green-200">
      <CardHeader>
        <CardTitle className="text-green-800 flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Addresses Fixed - Ready to Scan
        </CardTitle>
        <CardDescription>
          Wallet addresses have been corrected. Trigger a scan to detect transactions on the proper addresses.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-green-800 mb-2">✅ Addresses Successfully Updated:</h4>
          <div className="text-sm text-green-700 space-y-1">
            <div>• <strong>Bitcoin:</strong> bc1quy0j77s93uqg2r4x5lksur6fvsr7xxkh98cr4r (Bech32 format)</div>
            <div>• <strong>BSC:</strong> 0x02e9bF8E65B82cd111eED31D2cbA538c638DD84E (Different from ETH)</div>
            <div>• <strong>Monitoring:</strong> Now scanning correct addresses</div>
          </div>
        </div>

        <Button 
          onClick={handleTriggerScan}
          disabled={isScanning}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {isScanning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Scanning Wallets...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Start Transaction Scan
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};