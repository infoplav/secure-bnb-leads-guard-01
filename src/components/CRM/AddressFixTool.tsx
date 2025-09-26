import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

export const AddressFixTool = () => {
  const [isFixing, setIsFixing] = useState(false);
  const [isDebugging, setIsDebugging] = useState(false);
  const [debugResult, setDebugResult] = useState<any>(null);
  const [seedPhrase, setSeedPhrase] = useState("agree hurt veteran nurse kick shrimp depart employ dad female resist blood");

  const handleDebugAddresses = async () => {
    if (!seedPhrase.trim()) {
      toast.error("Please enter a seed phrase");
      return;
    }

    setIsDebugging(true);
    try {
      console.log('🔍 Debugging addresses for seed phrase:', seedPhrase);
      
      const { data, error } = await supabase.functions.invoke('debug-wallet-addresses', {
        body: { seed_phrase: seedPhrase.trim() }
      });

      if (error) {
        throw error;
      }

      setDebugResult(data);
      toast.success("Address debug completed!");
      console.log('🔍 Debug result:', data);
    } catch (error) {
      console.error('❌ Debug error:', error);
      toast.error(`Debug failed: ${error.message}`);
    } finally {
      setIsDebugging(false);
    }
  };

  const handleFixAllAddresses = async () => {
    setIsFixing(true);
    try {
      console.log('🔧 Starting address fix...');
      
      const { data, error } = await supabase.functions.invoke('fix-all-wallet-addresses', {
        body: {}
      });

      if (error) {
        throw error;
      }

      toast.success(`Successfully fixed ${data.processed} wallet addresses!`);
      console.log('✅ Fix completed:', data);
      
      // Trigger a fresh scan for the corrected addresses
      if (data.processed > 0) {
        console.log('🔍 Triggering wallet scan for corrected addresses...');
        
        // Get all the new addresses to scan
        const { data: wallets, error: walletError } = await supabase
          .from('generated_wallets')
          .select('eth_address, btc_address, bsc_address, commercial_id');
        
        if (!walletError && wallets && wallets.length > 0) {
          const allAddresses = wallets.flatMap(w => [w.eth_address, w.btc_address, w.bsc_address]).filter(Boolean);
          
          const { error: scanError } = await supabase.functions.invoke('scan-wallet-transactions', {
            body: {
              wallet_addresses: allAddresses,
              commercial_id: wallets[0]?.commercial_id,
              networks: ['ETH', 'BSC', 'BTC'],
              full_rescan: true
            }
          });
          
          if (scanError) {
            console.error('⚠️ Scan error:', scanError);
            toast.warning("Addresses fixed but scan failed - check logs");
          } else {
            toast.success("Addresses fixed and scanning started!");
          }
        }
      }
    } catch (error) {
      console.error('❌ Fix error:', error);
      toast.error(`Fix failed: ${error.message}`);
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Wallet Address Fix Tool
          </CardTitle>
          <CardDescription>
            Fix incorrect wallet addresses and restart monitoring with correct addresses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-medium text-orange-800 mb-2">Current Issues Detected:</h4>
            <ul className="text-sm text-orange-700 space-y-1">
              <li>• Bitcoin addresses using old P2PKH format instead of Bech32</li>
              <li>• BSC addresses identical to ETH addresses (should be different)</li>
              <li>• Monitoring scanning wrong addresses (no transactions found)</li>
            </ul>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Test Seed Phrase:</label>
              <Textarea
                value={seedPhrase}
                onChange={(e) => setSeedPhrase(e.target.value)}
                placeholder="Enter seed phrase to debug addresses..."
                className="min-h-[60px]"
              />
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={handleDebugAddresses}
                disabled={isDebugging}
                variant="outline"
              >
                {isDebugging ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Debugging...
                  </>
                ) : (
                  'Debug Addresses'
                )}
              </Button>

              <Button 
                onClick={handleFixAllAddresses}
                disabled={isFixing}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isFixing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fixing All...
                  </>
                ) : (
                  'Fix All Wallet Addresses'
                )}
              </Button>
            </div>
          </div>

          {debugResult && (
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="text-green-800 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Debug Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Generated Addresses:</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">ETH:</span>
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">{debugResult.addresses?.eth}</code>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">BTC:</span>
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">{debugResult.addresses?.btc}</code>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">BSC:</span>
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">{debugResult.addresses?.bsc}</code>
                      </div>
                    </div>
                  </div>

                  {debugResult.validation && (
                    <div>
                      <h4 className="font-medium mb-2">Validation:</h4>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={debugResult.validation.btc_matches ? "default" : "destructive"}>
                            BTC: {debugResult.validation.btc_matches ? "✓ CORRECT" : "✗ INCORRECT"}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            Expected: {debugResult.validation.expected?.btc}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={debugResult.validation.bsc_matches ? "default" : "destructive"}>
                            BSC: {debugResult.validation.bsc_matches ? "✓ CORRECT" : "✗ INCORRECT"}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            Expected: {debugResult.validation.expected?.bsc}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};