import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

interface HandNotification {
  id: string;
  userName: string;
  timestamp: number;
}

export const useMeetingState = (meetingId: string, userName: string) => {
  const [selectedVideoId, setSelectedVideoId] = useState<string>('local');
  const [currentParticipantId, setCurrentParticipantId] = useState<string>('');
  const [currentMeeting, setCurrentMeeting] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [meetingStartTime] = useState(new Date());
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>('good');
  const [handNotifications, setHandNotifications] = useState<HandNotification[]>([]);

  return {
    selectedVideoId,
    setSelectedVideoId,
    currentParticipantId,
    setCurrentParticipantId,
    currentMeeting,
    setCurrentMeeting,
    isFullscreen,
    setIsFullscreen,
    meetingStartTime,
    connectionQuality,
    setConnectionQuality,
    handNotifications,
    setHandNotifications
  };
};

export const useHandRaiseNotifications = (
  meetingId: string,
  userName: string,
  setHandNotifications: (fn: (prev: HandNotification[]) => HandNotification[]) => void
) => {
  const { toast } = useToast();

  useEffect(() => {
    if (!meetingId) return;

    const channel = supabase.channel(`meeting-hands-${meetingId}`);
    
    channel
      .on('broadcast', { event: 'hand-raised' }, (payload) => {
        const { userName: participantName, handRaised, timestamp } = payload.payload;
        
        if (participantName !== userName) {
          if (handRaised) {
            // Add new notification
            const newNotification: HandNotification = {
              id: `${participantName}-${timestamp}`,
              userName: participantName,
              timestamp
            };
            
            setHandNotifications(prev => [...prev, newNotification]);

            toast({
              title: "Hand Raised",
              description: `${participantName} has raised their hand`,
              duration: 5000,
              action: (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setHandNotifications(prev => 
                      prev.filter(n => n.id !== newNotification.id)
                    );
                  }}
                  className="ml-2"
                >
                  Dismiss
                </Button>
              )
            });
          } else {
            // Remove notification when hand is lowered
            setHandNotifications(prev => 
              prev.filter(n => n.userName !== participantName)
            );
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId, userName, setHandNotifications, toast]);
};

export const useFullscreenHandler = (setIsFullscreen: (fullscreen: boolean) => void) => {
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen toggle failed:', error);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [setIsFullscreen]);

  return { toggleFullscreen };
};

export const useConnectionQuality = (
  connectedPeers: string[],
  participants: any[],
  setConnectionQuality: (quality: 'good' | 'poor' | 'offline') => void
) => {
  // Reduce frequency of connection checks to prevent performance issues
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const checkConnectionQuality = () => {
      const totalExpectedPeers = Math.max(0, participants.length - 1); // -1 for current user
      const connectedPeerCount = connectedPeers.length;
      const isOnline = navigator.onLine;

      // Only log occasionally to reduce spam
      if (Math.random() < 0.1) { // Log 10% of the time
        console.log('Connection check:', {
          totalExpectedPeers,
          connectedPeerCount,
          participantsLength: participants.length,
          isOnline
        });
      }

      let quality: 'good' | 'poor' | 'offline';

      if (!isOnline) {
        quality = 'offline';
      } else if (totalExpectedPeers === 0) {
        quality = 'good'; // Solo meeting
      } else if (connectedPeerCount >= totalExpectedPeers * 0.8) {
        quality = 'good'; // At least 80% connected
      } else {
        quality = 'poor';
      }

      setConnectionQuality(quality);
    };

    // Initial check
    checkConnectionQuality();

    // Set up interval with longer delay to reduce overhead
    const intervalId = setInterval(checkConnectionQuality, 10000); // Every 10 seconds instead of 5

    // Handle online/offline events
    const handleOnline = () => {
      setConnectionQuality('good');
    };

    const handleOffline = () => {
      setConnectionQuality('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connectedPeers.length, participants.length, setConnectionQuality]); // More stable dependencies
};