import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { RefreshCw, LogOut, Clock, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Commercial {
  id: string;
  name: string;
  username: string;
  status: string;
  last_activity: string;
  session_id?: string;
  is_forced_logout: boolean;
}

export const CommercialStatus = () => {
  const [commercials, setCommercials] = useState<Commercial[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCommercials = async () => {
    try {
      const { data, error } = await supabase
        .from('commercials')
        .select('id, name, username, status, last_activity, session_id, is_forced_logout')
        .order('last_activity', { ascending: false });

      if (error) throw error;
      setCommercials(data || []);
    } catch (error) {
      console.error('Error fetching commercials:', error);
      toast({
        title: "Error",
        description: "Failed to fetch commercial status",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const forceLogout = async (commercialId: string, commercialName: string) => {
    try {
      const { error } = await supabase.rpc('force_logout_commercial', {
        commercial_id: commercialId
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `${commercialName} has been logged out`
      });

      fetchCommercials();
    } catch (error) {
      console.error('Error logging out commercial:', error);
      toast({
        title: "Error",
        description: "Failed to logout commercial",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string, lastActivity: string) => {
    if (status === 'online') {
      const activityDate = new Date(lastActivity);
      const now = new Date();
      const diffMinutes = (now.getTime() - activityDate.getTime()) / (1000 * 60);
      
      if (diffMinutes < 5) return 'bg-green-500';
      if (diffMinutes < 15) return 'bg-yellow-500';
      return 'bg-red-500';
    }
    return 'bg-gray-500';
  };

  const getStatusText = (status: string, lastActivity: string) => {
    if (status === 'online') {
      const activityDate = new Date(lastActivity);
      const now = new Date();
      const diffMinutes = (now.getTime() - activityDate.getTime()) / (1000 * 60);
      
      if (diffMinutes < 5) return 'Online';
      if (diffMinutes < 15) return 'Away';
      return 'Inactive';
    }
    return 'Offline';
  };

  useEffect(() => {
    fetchCommercials();

    // Set up real-time subscription
    const channel = supabase
      .channel('commercial-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'commercials'
        },
        () => {
          fetchCommercials();
        }
      )
      .subscribe();

    // Refresh every 30 seconds
    const interval = setInterval(fetchCommercials, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Commercial Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Commercial Status ({commercials.length})
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchCommercials}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {commercials.map((commercial) => (
            <div
              key={commercial.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${getStatusColor(
                      commercial.status,
                      commercial.last_activity
                    )}`}
                  />
                  <div>
                    <div className="font-medium">{commercial.name}</div>
                    <div className="text-sm text-muted-foreground">
                      @{commercial.username}
                    </div>
                  </div>
                </div>
                
                <Badge variant="outline">
                  {getStatusText(commercial.status, commercial.last_activity)}
                </Badge>

                {commercial.is_forced_logout && (
                  <Badge variant="destructive">Force Logged Out</Badge>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Last seen {formatDistanceToNow(new Date(commercial.last_activity))} ago
                  </div>
                </div>

                {commercial.status === 'online' && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => forceLogout(commercial.id, commercial.name)}
                    className="flex items-center gap-1"
                  >
                    <LogOut className="h-3 w-3" />
                    Force Logout
                  </Button>
                )}
              </div>
            </div>
          ))}

          {commercials.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No commercials found
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};