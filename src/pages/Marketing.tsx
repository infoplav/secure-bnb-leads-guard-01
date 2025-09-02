
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Upload, Mail, MessageSquare, Users, Edit, Phone, PhoneOff, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import CRMLogin from '@/components/CRM/CRMLogin';
import CommercialManagementWithStatus from '@/components/Marketing/CommercialManagementWithStatus';

const Marketing = () => {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <CRMLogin />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-yellow-400 mb-2">Marketing Dashboard</h1>
              <p className="text-gray-400">
                Manage commercials, monitor their status, and oversee marketing operations
              </p>
            </div>
            <div className="flex gap-2">
              <Link to="/lead">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Users className="h-4 w-4 mr-2" />
                  Lead Management
                </Button>
              </Link>
              <Link to="/editor">
                <Button className="bg-yellow-600 hover:bg-yellow-700 text-black">
                  <Edit className="h-4 w-4 mr-2" />
                  Template Editor
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Stats Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="h-5 w-5" />
                Commercial Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 text-sm">
                Create, edit, and monitor commercial status in real-time
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Phone className="h-5 w-5" />
                Lead Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 text-sm mb-3">
                Upload contacts, assign leads, and track progress
              </p>
              <Link to="/lead">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  <ArrowRight className="h-3 w-3 mr-1" />
                  Go to Leads
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Mail className="h-5 w-5" />
                Email Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 text-sm mb-3">
                Create and manage email templates for campaigns
              </p>
              <Link to="/editor">
                <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-black">
                  <Edit className="h-3 w-3 mr-1" />
                  Edit Templates
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <MessageSquare className="h-5 w-5" />
                SMS Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 text-sm mb-3">
                Design SMS templates for targeted messaging
              </p>
              <Link to="/editor">
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  SMS Editor
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Commercial Management */}
        <div className="space-y-8">
          <CommercialManagementWithStatus />
        </div>
      </div>
    </div>
  );
};

export default Marketing;
