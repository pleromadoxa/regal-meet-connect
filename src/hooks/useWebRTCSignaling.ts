
import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join' | 'leave' | 'user-info';
  data: any;
  from: string;
  to?: string;
  meetingId: string;
  userName?: string;
}

export const useWebRTCSignaling = (meetingId: string, userId: string, userName: string = '') => {
  const [connectedPeers, setConnectedPeers] = useState<Set<string>>(new Set());
  const [peerUserNames, setPeerUserNames] = useState<Map<string, string>>(new Map());
  const channelRef = useRef<any>(null);
  const { toast } = useToast();

  const initializeSignaling = useCallback(() => {
    if (channelRef.current) return;

    console.log('Initializing signaling for user:', userName);

    channelRef.current = supabase.channel(`meeting-${meetingId}`)
      .on('broadcast', { event: 'signaling' }, (payload) => {
        const message: SignalingMessage = payload.payload;
        
        // Don't process our own messages
        if (message.from === userId) return;
        
        // Handle user info messages
        if (message.type === 'user-info' && message.userName) {
          setPeerUserNames(prev => new Map(prev.set(message.from, message.userName!)));
          console.log('Received user info:', message.from, message.userName);
        }
        
        // Emit custom event for WebRTC hook to handle
        window.dispatchEvent(new CustomEvent('webrtc-signaling', {
          detail: message
        }));
      })
      .on('presence', { event: 'sync' }, () => {
        const newState = channelRef.current.presenceState();
        const peers = new Set(Object.keys(newState).filter(id => id !== userId));
        setConnectedPeers(peers);
        console.log('Presence sync, connected peers:', Array.from(peers));
      })
      .on('presence', { event: 'join' }, ({ key }: { key: string }) => {
        if (key !== userId) {
          setConnectedPeers(prev => new Set([...prev, key]));
          console.log('Peer joined:', key);
          
          // Send our user info to new peer
          setTimeout(() => {
            sendSignalingMessage({
              type: 'user-info',
              data: null,
              userName: userName
            });
          }, 100);
        }
      })
      .on('presence', { event: 'leave' }, ({ key }: { key: string }) => {
        if (key !== userId) {
          setConnectedPeers(prev => {
            const newSet = new Set(prev);
            newSet.delete(key);
            return newSet;
          });
          setPeerUserNames(prev => {
            const newMap = new Map(prev);
            newMap.delete(key);
            return newMap;
          });
          console.log('Peer left:', key);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channelRef.current.track({
            user_id: userId,
            user_name: userName,
            online_at: new Date().toISOString(),
          });
          
          // Broadcast user info to all peers
          setTimeout(() => {
            sendSignalingMessage({
              type: 'user-info',
              data: null,
              userName: userName
            });
          }, 500);
        }
      });

    return channelRef.current;
  }, [meetingId, userId, userName]);

  const sendSignalingMessage = useCallback((message: Omit<SignalingMessage, 'from' | 'meetingId'>) => {
    if (!channelRef.current) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'signaling',
      payload: {
        ...message,
        from: userId,
        meetingId,
        userName: userName
      }
    });
  }, [userId, meetingId, userName]);

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    setConnectedPeers(new Set());
    setPeerUserNames(new Map());
  }, []);

  return {
    initializeSignaling,
    sendSignalingMessage,
    connectedPeers,
    peerUserNames,
    cleanup
  };
};
