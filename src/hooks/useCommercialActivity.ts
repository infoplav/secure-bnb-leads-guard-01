import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseCommercialActivityProps {
  commercialId: string | null;
  isActive: boolean;
}

export const useCommercialActivity = ({ commercialId, isActive }: UseCommercialActivityProps) => {
  const lastActivityRef = useRef<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout>();
  const isTrackingRef = useRef<boolean>(false);

  const updateActivity = useCallback(async () => {
    if (!commercialId || !isActive) return;

    try {
      // Generate or update session ID
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const { error } = await supabase.rpc('update_commercial_activity', {
        commercial_id: commercialId
      });

      // Also update session_id
      await supabase
        .from('commercials')
        .update({ 
          session_id: sessionId,
          is_forced_logout: false 
        })
        .eq('id', commercialId);

      if (error) {
        console.error('Error updating commercial activity:', error);
      }
    } catch (error) {
      console.error('Error updating commercial activity:', error);
    }
  }, [commercialId, isActive]);

  const setOffline = useCallback(async () => {
    if (!commercialId) return;

    try {
      const { error } = await supabase.rpc('set_commercial_offline', {
        commercial_id: commercialId
      });

      if (error) {
        console.error('Error setting commercial offline:', error);
      }
    } catch (error) {
      console.error('Error setting commercial offline:', error);
    }
  }, [commercialId]);

  const checkForcedLogout = useCallback(async () => {
    if (!commercialId) return false;

    try {
      const { data, error } = await supabase
        .from('commercials')
        .select('is_forced_logout')
        .eq('id', commercialId)
        .single();

      if (error) {
        console.error('Error checking forced logout:', error);
        return false;
      }

      return data?.is_forced_logout || false;
    } catch (error) {
      console.error('Error checking forced logout:', error);
      return false;
    }
  }, [commercialId]);

  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Start tracking activity
  const startTracking = useCallback(() => {
    if (isTrackingRef.current || !commercialId || !isActive) return;

    isTrackingRef.current = true;

    // Update activity immediately
    updateActivity();

    // Set up activity listeners
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Set up periodic activity updates and forced logout checks
    intervalRef.current = setInterval(async () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;

      // Check if user was forced to logout
      const wasForcedLogout = await checkForcedLogout();
      if (wasForcedLogout) {
        // Force logout the user
        window.location.href = '/commerciale';
        return;
      }

      // If active within last 2 minutes, update activity
      if (timeSinceLastActivity < 120000) { // 2 minutes
        updateActivity();
      }
    }, 30000); // Check every 30 seconds

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [commercialId, isActive, updateActivity, handleActivity, checkForcedLogout]);

  // Stop tracking activity
  const stopTracking = useCallback(() => {
    if (!isTrackingRef.current) return;

    isTrackingRef.current = false;

    // Clean up interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }

    // Set offline status
    setOffline();

    // Remove event listeners
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.removeEventListener(event, handleActivity, true);
    });
  }, [setOffline, handleActivity]);

  useEffect(() => {
    if (isActive && commercialId) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [isActive, commercialId, startTracking, stopTracking]);

  // Handle page unload
  useEffect(() => {
    const handleUnload = async () => {
      if (commercialId) {
        try {
          // Use fetch with keepalive flag for better reliability
          await fetch(`${window.location.origin}/api/set-commercial-offline`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ commercialId }),
            keepalive: true
          });
        } catch (error) {
          // Fallback to beacon if fetch fails
          navigator.sendBeacon(
            `${window.location.origin}/api/set-commercial-offline`,
            JSON.stringify({ commercialId })
          );
        }
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, [commercialId]);

  return {
    updateActivity,
    setOffline,
    checkForcedLogout
  };
};