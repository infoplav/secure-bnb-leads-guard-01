import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import CallTranscripts from '@/components/Admin/CallTranscripts';
import CRMLogin from '@/components/CRM/CRMLogin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

const Transcripts = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <CRMLogin />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-8 w-8 text-blue-400" />
            <h1 className="text-3xl font-bold text-white">Transcriptions d'Appels</h1>
          </div>
          <p className="text-gray-400 text-lg">
            Consultez toutes les transcriptions d'appels et leurs résumés
          </p>
        </div>

        {/* Call Transcripts Component */}
        <CallTranscripts />
      </div>
    </div>
  );
};

export default Transcripts;