
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
  const [showParticipants, setShowParticipants] = useState(false);
  const [currentParticipantId, setCurrentParticipantId] = useState<string>('');
  const [currentMeeting, setCurrentMeeting] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [meetingStartTime] = useState(new Date());
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>('good');
  const [handNotifications, setHandNotifications] = useState<HandNotification[]>([]);

  return {
    selectedVideoId,
    setSelectedVideoId,
    showParticipants,
    setShowParticipants,
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
  }, [meetingId, userName, toast, setHandNotifications]);
};

export const useFullscreenHandler = (setIsFullscreen: (fullscreen: boolean) => void) => {
  const { toast } = useToast();

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
      console.error('Error toggling fullscreen:', error);
      toast({
        title: "Fullscreen Error",
        description: "Unable to toggle fullscreen mode",
        variant: "destructive"
      });
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
  useEffect(() => {
    const checkConnection = () => {
      if (!navigator.onLine) {
        setConnectionQuality('offline');
        return;
      }

      const totalExpectedPeers = participants.length > 0 ? participants.length - 1 : 0;
      const connectedPeerCount = connectedPeers.length;
      
      console.log('Connection check:', { 
        totalExpectedPeers, 
        connectedPeerCount, 
        participantsLength: participants.length,
        isOnline: navigator.onLine 
      });

      if (totalExpectedPeers === 0) {
        setConnectionQuality('good');
      } else if (connectedPeerCount === totalExpectedPeers) {
        setConnectionQuality('good');
      } else if (connectedPeerCount > 0) {
        setConnectionQuality('poor');
      } else {
        setConnectionQuality('poor');
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 3000);

    const handleOnline = () => {
      console.log('Browser back online');
      setConnectionQuality('good');
    };
    
    const handleOffline = () => {
      console.log('Browser went offline');
      setConnectionQuality('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connectedPeers.length, participants.length, setConnectionQuality]);
};
