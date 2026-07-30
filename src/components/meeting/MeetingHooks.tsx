import { useState, useEffect } from 'react';

export const useMeetingShellState = (meetingId: string, userName: string) => {
  const [selectedVideoId, setSelectedVideoId] = useState<string>('local');
  const [currentParticipantId, setCurrentParticipantId] = useState<string>('');
  const [currentMeeting, setCurrentMeeting] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [meetingStartTime] = useState(new Date());
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>('good');

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
  };
};

/** @deprecated Use useMeetingShellState */
export const useMeetingState = useMeetingShellState;

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
  useEffect(() => {
    const checkConnectionQuality = () => {
      const totalExpectedPeers = Math.max(0, participants.length - 1);
      const connectedPeerCount = connectedPeers.length;
      const isOnline = navigator.onLine;

      let quality: 'good' | 'poor' | 'offline';

      if (!isOnline) {
        quality = 'offline';
      } else if (totalExpectedPeers === 0) {
        quality = 'good';
      } else if (connectedPeerCount >= totalExpectedPeers * 0.8) {
        quality = 'good';
      } else {
        quality = 'poor';
      }

      setConnectionQuality(quality);
    };

    checkConnectionQuality();
    const intervalId = setInterval(checkConnectionQuality, 10000);

    const handleOnline = () => setConnectionQuality('good');
    const handleOffline = () => setConnectionQuality('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connectedPeers.length, participants.length, setConnectionQuality]);
};
