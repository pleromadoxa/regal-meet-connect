import { useEffect, useRef, useCallback } from 'react';
import { usePageVisibility } from './usePageVisibility';
import { useWakeLock } from './useWakeLock';
import { useToast } from './use-toast';

interface BackgroundMeetingOptions {
  onVisibilityChange?: (isVisible: boolean) => void;
  enableWakeLock?: boolean;
  maintainConnection?: boolean;
}

export const useBackgroundMeeting = ({
  onVisibilityChange,
  enableWakeLock = true,
  maintainConnection = true
}: BackgroundMeetingOptions = {}) => {
  const { isVisible, visibilityState } = usePageVisibility();
  const { requestWakeLock, releaseWakeLock, isActive: isWakeLockActive } = useWakeLock();
  const { toast } = useToast();
  const heartbeatRef = useRef<number | null>(null);
  const connectionCheckRef = useRef<number | null>(null);

  // Handle visibility changes with debounce to prevent rapid state changes
  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastVisibilityRef = useRef<boolean>(isVisible);
  
  useEffect(() => {
    // Only process visibility changes if they're actually different
    if (lastVisibilityRef.current === isVisible) return;
    
    // Clear previous timeout to debounce rapid changes
    if (visibilityTimeoutRef.current) {
      clearTimeout(visibilityTimeoutRef.current);
    }
    
    visibilityTimeoutRef.current = setTimeout(() => {
      lastVisibilityRef.current = isVisible;
      onVisibilityChange?.(isVisible);
      
      if (!isVisible) {
        console.log('Meeting moved to background - maintaining connection');
        
        if (enableWakeLock && !isWakeLockActive) {
          requestWakeLock().then((success) => {
            if (success) {
              toast({
                title: "Meeting Active",
                description: "Screen will stay awake during the meeting",
                duration: 3000,
              });
            }
          });
        }
        
        // Start heartbeat to keep connection alive
        if (maintainConnection && !heartbeatRef.current) {
          startHeartbeat();
        }
      } else {
        console.log('Meeting returned to foreground');
        stopHeartbeat();
      }
    }, 200); // 200ms debounce to prevent rapid visibility changes
  }, [isVisible, enableWakeLock, isWakeLockActive, maintainConnection, onVisibilityChange, requestWakeLock, toast]);

  const startHeartbeat = useCallback(() => {
    // Send periodic heartbeats to prevent connection timeout (less frequent to reduce interference)
    heartbeatRef.current = window.setInterval(() => {
      // Dispatch a custom event to keep WebRTC connections alive
      window.dispatchEvent(new CustomEvent('meeting-heartbeat', {
        detail: { timestamp: Date.now(), hidden: !isVisible }
      }));
    }, 10000); // Send heartbeat every 10 seconds (less frequent)
    
    // Also perform connection checks (less frequent)
    connectionCheckRef.current = window.setInterval(() => {
      window.dispatchEvent(new CustomEvent('meeting-connection-check', {
        detail: { timestamp: Date.now() }
      }));
    }, 30000); // Check connection every 30 seconds (less frequent)
  }, [isVisible]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    
    if (connectionCheckRef.current) {
      clearInterval(connectionCheckRef.current);
      connectionCheckRef.current = null;
    }
  }, []);

  const startMeeting = useCallback(async () => {
    if (enableWakeLock) {
      await requestWakeLock();
    }
    
    console.log('Meeting started with background support');
    
    toast({
      title: "Meeting Started",
      description: "Meeting will remain active in background",
      duration: 3000,
    });
  }, [enableWakeLock, requestWakeLock, toast]);

  const endMeeting = useCallback(async () => {
    stopHeartbeat();
    await releaseWakeLock();
    
    console.log('Meeting ended, background features disabled');
  }, [stopHeartbeat, releaseWakeLock]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }
      stopHeartbeat();
      releaseWakeLock();
    };
  }, [stopHeartbeat, releaseWakeLock]);

  // Handle page unload
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = 'Are you sure you want to leave the meeting?';
      return 'Are you sure you want to leave the meeting?';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return {
    isVisible,
    visibilityState,
    isWakeLockActive,
    startMeeting,
    endMeeting,
    startHeartbeat,
    stopHeartbeat
  };
};
