import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWebRTCSignaling } from './useWebRTCSignaling';
import { useNetworkOptimization } from './useNetworkOptimization';
import { useBandwidthAware } from './useBandwidthAware';
import { usePageVisibility } from './usePageVisibility';
import { useConnectionManager } from './useConnectionManager';
import { useManyParticipantsOptimization } from './useManyParticipantsOptimization';
import { loadMeetingMediaPrefs } from '@/lib/meetingMediaPrefs';
import { acquireUserMedia, getMediaAccessErrorInfo } from '@/lib/mediaAccess';
import {
  createPeerConnectionQueue,
  isScreenShareTrack,
  MEETING_LIMITS,
} from '@/lib/largeMeeting';
import {
  defaultMediaRouting,
  type MeetingMediaRoutingOptions,
} from '@/lib/meetingTopology';
import {
  cancelPeerDisconnectCleanup,
  clearAllPeerDisconnectTimers,
  restartPeerNegotiation,
  schedulePeerDisconnectCleanup,
} from '@/lib/peerReconnection';
import { replaceOrAddVideoTrack } from '@/lib/videoPeerTrack';
import { MAX_PEER_RECONNECT_ATTEMPTS } from '@/lib/webrtcSignaling';

export type { MeetingMediaRoutingOptions } from '@/lib/meetingTopology';

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join' | 'leave' | 'user-info' | 'audio-toggle';
  data: any;
  from: string;
  to?: string;
  meetingId: string;
  userName?: string;
}

export type InitializeMediaOptions = {
  stream?: MediaStream;
  video?: boolean;
  audio?: boolean;
};

export const useWebRTC = (
  meetingId: string,
  userName: string,
  userId: string,
  mediaRouting: MeetingMediaRoutingOptions = defaultMediaRouting
) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isVideoEnabled, setIsVideoEnabled] = useState(false); // Start with camera off by default
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenShareStream, setScreenShareStream] = useState<MediaStream | null>(null);
  const [hostScreenStream, setHostScreenStream] = useState<MediaStream | null>(null);
  const [currentFacingMode, setCurrentFacingMode] = useState<"user" | "environment">('user');
  const [currentAudioDevice, setCurrentAudioDevice] = useState<string>('');
  const [currentVideoDevice, setCurrentVideoDevice] = useState<string>('');
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
  const [peerConnections, setPeerConnections] = useState<Map<string, RTCPeerConnection>>(new Map());

  const syncPeerConnections = useCallback(() => {
    setPeerConnections(new Map(peerConnectionsRef.current));
  }, []);
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const syncHostScreenRef = useRef<() => void>(() => undefined);
  const peerQueueRef = useRef<ReturnType<typeof createPeerConnectionQueue> | null>(null);
  const createOfferRef = useRef<((remoteUserId: string) => Promise<void>) | null>(null);
  const mediaRoutingRef = useRef(mediaRouting);
  mediaRoutingRef.current = mediaRouting;
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  // Network optimization hook
  const {
    connectionQuality,
    isOptimizing,
    startMonitoring,
    stopMonitoring,
    setQualityOverride
  } = useNetworkOptimization();

  // Bandwidth-aware constraints hook
  const { getOptimalConstraints, getScreenShareConstraints } = useBandwidthAware();

  // Enhanced connection management
  const {
    getOptimizedRTCConfiguration,
    monitorConnectionHealth,
    handleConnectionRecovery,
    getAdaptiveMediaConstraints
  } = useConnectionManager({
    enableHeartbeat: true,
    heartbeatInterval: 5000,
    maxReconnectAttempts: 6,
  });

  // Many participants optimization
  const {
    optimizationSettings,
    updateParticipantCount,
    getOptimizedMediaConstraints,
    applyOptimizedBitrate,
    shouldRenderVideo,
    setPlanLimits,
  } = useManyParticipantsOptimization();

  // Use the signaling hook
  const { 
    initializeSignaling, 
    sendSignalingMessage, 
    connectedPeers: signalingPeers,
    peerUserNames,
    cleanup: cleanupSignaling 
  } = useWebRTCSignaling(meetingId, userId, userName);

  const sendSignalingMessageRef = useRef(sendSignalingMessage);
  sendSignalingMessageRef.current = sendSignalingMessage;
  const initializeSignalingRef = useRef(initializeSignaling);
  initializeSignalingRef.current = initializeSignaling;

  const syncHostScreenFromRemotes = useCallback(() => {
    for (const stream of remoteStreamsRef.current.values()) {
      const videoTrack = stream.getVideoTracks().find((t) => t.readyState === 'live');
      if (videoTrack && isScreenShareTrack(videoTrack)) {
        setHostScreenStream(stream);
        return;
      }
    }
    setHostScreenStream(null);
  }, []);

  syncHostScreenRef.current = syncHostScreenFromRemotes;

  // Add device change monitoring
  useEffect(() => {
    const handleDeviceChange = () => {
      console.log('🔄 Media devices changed, re-enumerating...');
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        const audioDevices = devices.filter(device => device.kind === 'audioinput');
        console.log('📱 Updated devices:', {
          video: videoDevices.length,
          audio: audioDevices.length
        });
      });
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, []);

  // Update participant count for optimization (prevent infinite loops)
  useEffect(() => {
    const newPeerCount = Array.from(signalingPeers).length + 1; // +1 for local user
    
    // Only update if the count actually changed
    if (connectedPeers.length !== Array.from(signalingPeers).length) {
      setConnectedPeers(Array.from(signalingPeers));
    }
    
    // Throttle optimization updates to prevent loops
    const timeoutId = setTimeout(() => {
      updateParticipantCount(newPeerCount);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [signalingPeers.size]); // Only depend on size, not the set contents

  // Page visibility for background handling
  const { isVisible } = usePageVisibility();

  // Handle background state changes
  useEffect(() => {
    const handleBackgroundStateChange = () => {
      if (!isVisible) {
        console.log('Meeting moved to background - maintaining WebRTC connections');
        
        // Keep connections alive with periodic ICE connectivity checks
        peerConnectionsRef.current.forEach((pc, peerId) => {
          if (pc.connectionState === 'connected') {
            // Force ICE connectivity check to keep connection alive
            pc.getStats().then(stats => {
              console.log(`Background stats check for ${peerId}:`, stats.size);
            }).catch(err => {
              console.warn(`Background stats check failed for ${peerId}:`, err);
            });
          }
        });
      } else {
        console.log('Meeting returned to foreground');
      }
    };

    // Listen for custom heartbeat events
    const handleHeartbeat = () => {
      if (!isVisible) {
        handleBackgroundStateChange();
      }
    };

    // Listen for connection check events
    const handleConnectionCheck = () => {
      peerConnectionsRef.current.forEach((pc, peerId) => {
        if (pc.connectionState !== 'connected') {
          console.warn(`Connection issue detected for ${peerId}:`, pc.connectionState);
          if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            void restartPeerNegotiation(pc, async (offer) => {
              sendSignalingMessageRef.current({ type: 'offer', to: peerId, data: offer });
            });
          }
        }
      });
    };

    window.addEventListener('meeting-heartbeat', handleHeartbeat);
    window.addEventListener('meeting-connection-check', handleConnectionCheck);

    return () => {
      window.removeEventListener('meeting-heartbeat', handleHeartbeat);
      window.removeEventListener('meeting-connection-check', handleConnectionCheck);
    };
  }, [isVisible]);

  useEffect(() => {
    if (!meetingId || !userName || !userId) return;

    console.log('Initializing WebRTC for:', { meetingId, userName, userId });
    
    const signalingChannel = initializeSignalingRef.current();

    // Perfect-negotiation state per peer
    const pendingCandidatesRef = new Map<string, RTCIceCandidateInit[]>();
    const makingOfferRef = new Map<string, boolean>();
    // The peer with the lexicographically smaller ID is "polite"
    const isPolite = (remoteId: string) => userId < remoteId;

    const createPeerConnection = (remoteUserId: string) => {
      console.log('Creating peer connection for:', remoteUserId, 'polite:', isPolite(remoteUserId));
      const pc = new RTCPeerConnection(getOptimizedRTCConfiguration());
      makingOfferRef.set(remoteUserId, false);
      pendingCandidatesRef.set(remoteUserId, []);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignalingMessageRef.current({
            type: 'ice-candidate',
            to: remoteUserId,
            data: event.candidate.toJSON(),
          });
        }
      };

      pc.ontrack = (event) => {
        console.log('Received remote stream track:', event);
        const stream = event.streams[0] ?? new MediaStream([event.track]);
        if (!stream.getTracks().includes(event.track)) {
          stream.addTrack(event.track);
        }
        remoteStreamsRef.current.set(remoteUserId, stream);
        setRemoteStreams(new Map(remoteStreamsRef.current));

        const watchTrack = (track: MediaStreamTrack) => {
          track.onended = () => syncHostScreenRef.current();
          if (track.kind === 'video') {
            track.onmute = () => syncHostScreenRef.current();
            track.onunmute = () => syncHostScreenRef.current();
          }
        };
        watchTrack(event.track);

        syncHostScreenRef.current();
      };

      pc.oniceconnectionstatechange = () => {
        console.log(`ICE state for ${remoteUserId}:`, pc.iceConnectionState);
        if (pc.iceConnectionState === 'failed') {
          void restartPeerNegotiation(pc, async (offer) => {
            sendSignalingMessageRef.current({ type: 'offer', to: remoteUserId, data: offer });
          });
        }
      };

      pc.onnegotiationneeded = async () => {
        try {
          makingOfferRef.set(remoteUserId, true);
          const offer = await pc.createOffer();
          if (pc.signalingState !== 'stable') return;
          await pc.setLocalDescription(offer);
          sendSignalingMessageRef.current({ type: 'offer', to: remoteUserId, data: pc.localDescription });
        } catch (err) {
          console.error('negotiationneeded error:', err);
        } finally {
          makingOfferRef.set(remoteUserId, false);
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('Peer connection state change:', pc.connectionState);
        const cleanupPeer = () => {
          cancelPeerDisconnectCleanup(remoteUserId);
          remoteStreamsRef.current.delete(remoteUserId);
          setRemoteStreams(new Map(remoteStreamsRef.current));
          peerConnectionsRef.current.delete(remoteUserId);
          pendingCandidatesRef.delete(remoteUserId);
          makingOfferRef.delete(remoteUserId);
          syncPeerConnections();
        };

        if (pc.connectionState === 'disconnected') {
          schedulePeerDisconnectCleanup(remoteUserId, () => {
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
              console.log('Peer still disconnected after grace — attempting ICE restart:', remoteUserId);
              void restartPeerNegotiation(pc, async (offer) => {
                sendSignalingMessageRef.current({ type: 'offer', to: remoteUserId, data: offer });
              });
            }
          });
          return;
        }

        if (pc.connectionState === 'connected') {
          cancelPeerDisconnectCleanup(remoteUserId);
          return;
        }

        if (pc.connectionState === 'failed') {
          schedulePeerDisconnectCleanup(remoteUserId, () => {
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
              console.log('Peer failed after grace — attempting renegotiation:', remoteUserId);
              void restartPeerNegotiation(pc, async (offer) => {
                sendSignalingMessageRef.current({ type: 'offer', to: remoteUserId, data: offer });
              });
            }
          });
          return;
        }

        if (pc.connectionState === 'closed') {
          cleanupPeer();
        }
      };

      if (localStreamRef.current && mediaRoutingRef.current.publishToMesh !== false) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      } else {
        pc.addTransceiver('audio', { direction: 'recvonly' });
        pc.addTransceiver('video', { direction: 'recvonly' });
      }

      peerConnectionsRef.current.set(remoteUserId, pc);
      syncPeerConnections();

      // Start network monitoring and connection health checks
      startMonitoring(pc);
      monitorConnectionHealth(pc, remoteUserId);
      handleConnectionRecovery(pc, remoteUserId, () => {
        void restartPeerNegotiation(pc, async (offer) => {
          sendSignalingMessageRef.current({ type: 'offer', to: remoteUserId, data: offer });
        });
      });

      return pc;
    };

    const flushPendingCandidates = async (remoteUserId: string, pc: RTCPeerConnection) => {
      const queue = pendingCandidatesRef.get(remoteUserId) || [];
      while (queue.length) {
        const c = queue.shift()!;
        try { await pc.addIceCandidate(new RTCIceCandidate(c)); }
        catch (err) { console.warn('Failed to flush queued ICE candidate:', err); }
      }
    };

    const handleSignalingMessage = async (message: SignalingMessage) => {
      const remoteUserId = message.from;

      if (
        message.type !== 'leave' &&
        message.type !== 'rejoin' &&
        message.type !== 'audio-toggle' &&
        (!mediaRoutingRef.current.useMesh || !mediaRoutingRef.current.shouldConnectToPeer(remoteUserId))
      ) {
        return;
      }

      if (message.type === 'offer') {
        let pc = peerConnectionsRef.current.get(remoteUserId);
        if (!pc) pc = createPeerConnection(remoteUserId);

        const polite = isPolite(remoteUserId);
        const offerCollision = makingOfferRef.get(remoteUserId) || pc.signalingState !== 'stable';
        if (offerCollision && !polite) {
          console.log('Impolite peer ignoring colliding offer from', remoteUserId);
          return;
        }

        try {
          if (offerCollision) {
            await Promise.all([
              pc.setLocalDescription({ type: 'rollback' } as any).catch(() => {}),
              pc.setRemoteDescription(new RTCSessionDescription(message.data)),
            ]);
          } else {
            await pc.setRemoteDescription(new RTCSessionDescription(message.data));
          }
          await flushPendingCandidates(remoteUserId, pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignalingMessageRef.current({ type: 'answer', to: remoteUserId, data: pc.localDescription });
        } catch (error) {
          console.error('Error handling offer:', error);
        }
      } else if (message.type === 'answer') {
        const pc = peerConnectionsRef.current.get(remoteUserId);
        if (pc && pc.signalingState === 'have-local-offer') {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(message.data));
            await flushPendingCandidates(remoteUserId, pc);
          } catch (error) {
            console.error('Error handling answer:', error);
          }
        }
      } else if (message.type === 'ice-candidate') {
        const pc = peerConnectionsRef.current.get(remoteUserId);
        if (!pc || !message.data) return;
        if (!pc.remoteDescription || !pc.remoteDescription.type) {
          const q = pendingCandidatesRef.get(remoteUserId) || [];
          q.push(message.data);
          pendingCandidatesRef.set(remoteUserId, q);
          return;
        }
        try {
          await pc.addIceCandidate(new RTCIceCandidate(message.data));
        } catch (error) {
          if (!(makingOfferRef.get(remoteUserId) === false && isPolite(remoteUserId))) {
            console.warn('Error adding ICE candidate (ignored):', error);
          }
        }
      } else if (message.type === 'leave') {
        cancelPeerDisconnectCleanup(remoteUserId);
        const pc = peerConnectionsRef.current.get(remoteUserId);
        if (pc) {
          pc.close();
          peerConnectionsRef.current.delete(remoteUserId);
          remoteStreamsRef.current.delete(remoteUserId);
          setRemoteStreams(new Map(remoteStreamsRef.current));
          pendingCandidatesRef.delete(remoteUserId);
          makingOfferRef.delete(remoteUserId);
          syncPeerConnections();
        }
      } else if (message.type === 'rejoin') {
        cancelPeerDisconnectCleanup(remoteUserId);
        const existing = peerConnectionsRef.current.get(remoteUserId);
        if (existing) {
          existing.close();
          peerConnectionsRef.current.delete(remoteUserId);
          pendingCandidatesRef.delete(remoteUserId);
          makingOfferRef.delete(remoteUserId);
        }
        if (createOfferRef.current) {
          void createOfferRef.current(remoteUserId);
        }
      } else if (message.type === 'audio-toggle') {
        // Handled by listeners elsewhere
      }
    };

    const handleWebRTCSignaling = (event: any) => {
      handleSignalingMessage(event.detail);
    };

    window.addEventListener('webrtc-signaling', handleWebRTCSignaling);

    const createOffer = async (remoteUserId: string) => {
      if (!mediaRoutingRef.current.useMesh || !mediaRoutingRef.current.shouldConnectToPeer(remoteUserId)) {
        return;
      }
      // Only the peer with the smaller ID initiates to avoid glare
      if (!(userId < remoteUserId)) {
        console.log('Skipping offer initiation (other peer is initiator):', remoteUserId);
        // Still create the PC so we can answer when their offer arrives
        if (!peerConnectionsRef.current.has(remoteUserId)) createPeerConnection(remoteUserId);
        return;
      }
      if (peerConnectionsRef.current.has(remoteUserId)) return;
      const pc = createPeerConnection(remoteUserId);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignalingMessageRef.current({ type: 'offer', to: remoteUserId, data: pc.localDescription });
      } catch (error) {
        console.error('Error creating offer:', error);
      }
    };

    // Store createOffer function for access in other effects
    createOfferRef.current = createOffer;

    peerQueueRef.current = createPeerConnectionQueue((peerId) => {
      if (createOfferRef.current) void createOfferRef.current(peerId);
    });

    // Listen for host mute commands
    const muteChannel = supabase.channel(`meeting-mute-${userId}`);
    muteChannel
      .on('broadcast', { event: 'mute-toggle' }, (payload) => {
        const { participantId, isMuted, fromHost } = payload.payload;
        
        if (participantId === userId && fromHost) {
          console.log('Received mute command from host:', isMuted);
          
          if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
              audioTrack.enabled = !isMuted;
              setIsAudioEnabled(!isMuted);
              
              toastRef.current({
                title: isMuted ? "You have been muted by the host" : "You have been unmuted by the host",
                description: isMuted ? "Your microphone is now muted" : "Your microphone is now active",
                variant: isMuted ? "destructive" : "default"
              });
            }
          }
        }
      })
      .subscribe();

    const cleanupListeners = () => {
      console.log('Cleaning up WebRTC listeners');
      clearAllPeerDisconnectTimers();
      supabase.removeChannel(muteChannel);
      window.removeEventListener('webrtc-signaling', handleWebRTCSignaling);
      createOfferRef.current = null;

      peerConnectionsRef.current.forEach(pc => {
        pc.close();
      });
      peerConnectionsRef.current.clear();

      remoteStreamsRef.current.forEach(stream => {
        stream.getTracks().forEach(track => track.stop());
      });
      remoteStreamsRef.current.clear();
      setRemoteStreams(new Map());
    };

    return cleanupListeners;
  }, [meetingId, userId]);

  // Handle peer connection setup when new peers join
  useEffect(() => {
    if (!mediaRouting.useMesh) {
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      peerQueueRef.current?.clear();
      remoteStreamsRef.current.clear();
      setRemoteStreams(new Map());
      syncPeerConnections();
      return;
    }

    const handleNewPeers = () => {
      const currentPeers = Array.from(signalingPeers);
      console.log('Current signaling peers:', currentPeers);
      
      currentPeers.forEach(peerId => {
        if (!mediaRoutingRef.current.shouldConnectToPeer(peerId)) return;
        if (!peerConnectionsRef.current.has(peerId)) {
          if (signalingPeers.size + 1 > MEETING_LIMITS.maxMeshPeerConnections) return;
          peerQueueRef.current?.enqueue(peerId);
        }
      });
    };

    if (signalingPeers.size > 0) {
      handleNewPeers();
    }
  }, [signalingPeers, mediaRouting.useMesh, syncPeerConnections]);

  useEffect(() => {
    const reconnectAll = () => {
      if (!mediaRoutingRef.current.useMesh) return;
      Array.from(signalingPeers).forEach((peerId) => {
        if (!mediaRoutingRef.current.shouldConnectToPeer(peerId)) return;
        const pc = peerConnectionsRef.current.get(peerId);
        if (!pc || pc.connectionState !== 'connected') {
          if (pc) {
            pc.close();
            peerConnectionsRef.current.delete(peerId);
          }
          peerQueueRef.current?.enqueue(peerId);
        }
      });
      syncPeerConnections();
    };

    window.addEventListener('meeting-network-online', reconnectAll);
    window.addEventListener('meeting-visibility-resume', reconnectAll);
    return () => {
      window.removeEventListener('meeting-network-online', reconnectAll);
      window.removeEventListener('meeting-visibility-resume', reconnectAll);
    };
  }, [signalingPeers, syncPeerConnections]);

  // Drop to audio-only locally when network quality is critical
  useEffect(() => {
    if (connectionQuality.metrics.qualityLevel !== 'potato') return;
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = false;
    });
    if (isVideoEnabled) setIsVideoEnabled(false);
  }, [connectionQuality.metrics.qualityLevel, isVideoEnabled]);

  useEffect(() => {
    syncHostScreenFromRemotes();
  }, [remoteStreams, syncHostScreenFromRemotes]);

  const initialize = useCallback(async (options?: InitializeMediaOptions) => {
    try {
      console.log('🎥 Initializing WebRTC media...');

      const prefs = await loadMeetingMediaPrefs(userId);
      const wantVideo = options?.video ?? prefs.camera_default_on;
      const wantAudio = options?.audio ?? prefs.microphone_default_on;

      let constraints = getOptimizedMediaConstraints(wantVideo) as MediaStreamConstraints;
      console.log('📋 Using media constraints:', constraints);

      const stream =
        options?.stream ??
        (await acquireUserMedia(constraints, prefs));

      console.log('✅ Got media stream:', {
        id: stream.id,
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
      });

      stream.getVideoTracks().forEach((track) => {
        track.enabled = wantVideo;
      });
      stream.getAudioTracks().forEach((track) => {
        track.enabled = wantAudio;
      });

      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsVideoEnabled(wantVideo && stream.getVideoTracks().length > 0);
      setIsAudioEnabled(wantAudio && stream.getAudioTracks().length > 0);

      const audioTrack = stream.getAudioTracks()[0];
      const videoTrack = stream.getVideoTracks()[0];

      if (audioTrack) {
        setCurrentAudioDevice(audioTrack.label);
      }

      if (videoTrack) {
        setCurrentVideoDevice(videoTrack.label);
      }

      console.log('🚀 WebRTC media initialization complete');
    } catch (error) {
      console.error('❌ WebRTC initialization failed:', error);
      const info = getMediaAccessErrorInfo(error);
      toast({
        title: info.title,
        description: info.description,
        variant: 'destructive',
        duration: 8000,
      });
      throw error;
    }
  }, [toast, getOptimizedMediaConstraints, userId]);

  const toggleVideo = useCallback(async (): Promise<boolean> => {
    if (!localStreamRef.current) return isVideoEnabled;

    const videoTracks = localStreamRef.current.getVideoTracks();
    if (videoTracks.length === 0) {
      try {
        const prefs = await loadMeetingMediaPrefs(userId);
        const constraints = getOptimizedMediaConstraints(true) as MediaStreamConstraints;
        const videoStream = await acquireUserMedia(
          { ...constraints, audio: false },
          prefs
        );
        const videoTrack = videoStream.getVideoTracks()[0];
        if (!videoTrack) throw new Error('No video track');

        localStreamRef.current.addTrack(videoTrack);
        setLocalStream(new MediaStream([...localStreamRef.current.getTracks()]));
        setIsVideoEnabled(true);
        setCurrentVideoDevice(videoTrack.label);

        await Promise.all(
          Array.from(peerConnectionsRef.current.entries()).map(async ([peerId, pc]) => {
            if (screenTrackRef.current) return;
            try {
              await replaceOrAddVideoTrack(pc, videoTrack, localStreamRef.current!);
              await restartPeerNegotiation(pc, async (offer) => {
                sendSignalingMessageRef.current({
                  type: 'offer',
                  to: peerId,
                  data: offer,
                });
              });
            } catch (error) {
              console.warn('Failed to enable camera for peer:', error);
            }
          })
        );

        toast({
          title: 'Camera on',
          description: 'Video is now enabled',
        });
        return true;
      } catch (error) {
        console.error('Failed to enable camera:', error);
        const info = getMediaAccessErrorInfo(error);
        toast({
          title: info.title,
          description: info.description,
          variant: 'destructive',
        });
        return false;
      }
    }

    let newEnabled = false;
    videoTracks.forEach((track) => {
      newEnabled = !track.enabled;
      track.enabled = newEnabled;
      setIsVideoEnabled(newEnabled);
      console.log('Video toggled:', newEnabled);
    });
    return newEnabled;
  }, [isVideoEnabled, toast, getOptimizedMediaConstraints, userId]);

  const toggleAudio = useCallback(async (): Promise<boolean> => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        const newEnabled = !audioTrack.enabled;
        audioTrack.enabled = newEnabled;
        setIsAudioEnabled(newEnabled);
        
        console.log('Audio toggled:', newEnabled);
        
        // Send audio state to other participants
        sendSignalingMessage({
          type: 'audio-toggle',
          data: { enabled: newEnabled }
        });
        
        toast({
          title: newEnabled ? "Microphone On" : "Microphone Off",
          description: newEnabled ? "You are now unmuted" : "You are now muted"
        });
        
        return newEnabled;
      }
    }
    return isAudioEnabled;
  }, [isAudioEnabled, toast]);

  const switchCamera = useCallback(async () => {
    if (!localStreamRef.current) {
      console.warn('No local stream available for camera switch');
      return;
    }

    try {
      console.log('🔄 Switching camera from:', currentFacingMode);
      const newFacingMode: "user" | "environment" = currentFacingMode === 'user' ? 'environment' : 'user';
      
      // Get new video stream with different facing mode using adaptive constraints
      const constraints = getOptimalConstraints(
        connectionQuality.metrics.qualityLevel,
        newFacingMode
      );
      
      console.log('📹 Requesting new camera with constraints:', constraints);
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const newVideoTrack = newStream.getVideoTracks()[0];

      if (!newVideoTrack) {
        console.error('No video track in new stream');
        return;
      }

      // Stop old video track
      const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
      if (oldVideoTrack) {
        oldVideoTrack.stop();
        console.log('✅ Stopped old video track');
      }

      // Replace video track in local stream
      if (localStreamRef.current) {
        // Remove old video track
        if (oldVideoTrack) {
          localStreamRef.current.removeTrack(oldVideoTrack);
        }
        // Add new video track
        localStreamRef.current.addTrack(newVideoTrack);
        console.log('✅ Updated local stream with new video track');
      }

      // Update peer connections with new video track
      const replacePromises: Promise<void>[] = [];
      peerConnectionsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          const promise = sender.replaceTrack(newVideoTrack)
            .then(() => console.log('✅ Replaced video track for peer'))
            .catch((error) => {
              console.error('❌ Error replacing video track:', error);
            });
          replacePromises.push(promise);
        }
      });

      // Wait for all tracks to be replaced
      await Promise.all(replacePromises);

      // Update state
      setCurrentFacingMode(newFacingMode);
      setCurrentVideoDevice(newVideoTrack.label);
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      
      console.log('✅ Camera switched successfully to:', newFacingMode);
      
      toast({
        title: "Camera Switched",
        description: `Now using ${newFacingMode === 'user' ? 'front' : 'back'} camera`,
        duration: 2000
      });
    } catch (error) {
      console.error('❌ Error switching camera:', error);
      toast({
        title: "Camera Switch Failed",
        description: error instanceof Error ? error.message : "Failed to switch camera. Please try again.",
        variant: "destructive"
      });
    }
  }, [currentFacingMode, getOptimalConstraints, connectionQuality.metrics.qualityLevel, toast]);

  const toggleScreenShare = useCallback(async () => {
    if (!isScreenSharing) {
      try {
        console.log('Starting screen share...');
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ 
          video: {
            width: { ideal: 1920, max: 1920 },
            height: { ideal: 1080, max: 1080 },
            frameRate: { ideal: 15, max: 30 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          }
        });
        
        const screenTrack = displayStream.getVideoTracks()[0];
        const audioTrack = displayStream.getAudioTracks()[0];
        
        if (screenTrack) {
          screenTrackRef.current = screenTrack;
          setScreenShareStream(displayStream);
          
          // Handle screen share ending
          screenTrack.onended = () => {
            console.log('Screen sharing stopped by user');
            setIsScreenSharing(false);
            setScreenShareStream(null);
            peerConnectionsRef.current.forEach(async (pc) => {
              const sender = pc.getSenders().find(s => s.track?.kind === 'video');
              if (sender && localStreamRef.current) {
                const cameraTrack = localStreamRef.current.getVideoTracks()[0];
                if (cameraTrack) {
                  try {
                    await sender.replaceTrack(cameraTrack);
                    console.log('Restored camera track for peer connection');
                  } catch (error) {
                    console.error('Error restoring camera track:', error);
                  }
                }
              }
            });
            
            screenTrackRef.current = null;
            
            toast({
              title: "Screen Share Stopped",
              description: "You have stopped sharing your screen"
            });
          };

          await Promise.all(
            Array.from(peerConnectionsRef.current.entries()).map(async ([peerId, pc]) => {
              const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
              if (sender) {
                try {
                  await sender.replaceTrack(screenTrack);
                  console.log('Replaced video track with screen share for peer connection');
                } catch (error) {
                  console.error('Error replacing track with screen share:', error);
                }
              } else {
                try {
                  pc.addTrack(screenTrack, displayStream);
                } catch (error) {
                  console.error('Error adding screen share track:', error);
                }
              }

              try {
                await restartPeerNegotiation(pc, async (offer) => {
                  sendSignalingMessageRef.current({
                    type: 'offer',
                    to: peerId,
                    data: offer,
                  });
                });
              } catch (error) {
                console.warn('Screen share renegotiation failed:', error);
              }
            })
          );

          syncHostScreenRef.current();

          // If there's audio from screen share, handle it
          if (audioTrack) {
            // Add audio track to peer connections
            peerConnectionsRef.current.forEach((pc) => {
              try {
                pc.addTrack(audioTrack, displayStream);
                console.log('Added screen share audio track');
              } catch (error) {
                console.error('Error adding screen share audio:', error);
              }
            });
          }

          setIsScreenSharing(true);
          
          toast({
            title: "Screen Share Started",
            description: "You are now sharing your screen"
          });
        }
      } catch (error) {
        console.error('Error accessing display media:', error);
        toast({
          title: "Screen Share Error",
          description: "Failed to start screen sharing. Please check your permissions.",
          variant: "destructive"
        });
      }
    } else {
      // Stop screen sharing
      console.log('Stopping screen share...');
      
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }

      // Restore camera video for all peer connections
      await Promise.all(
        Array.from(peerConnectionsRef.current.entries()).map(async ([peerId, pc]) => {
          const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (videoSender && localStreamRef.current) {
            const cameraTrack = localStreamRef.current.getVideoTracks()[0];
            if (cameraTrack) {
              try {
                await videoSender.replaceTrack(cameraTrack);
              } catch (error) {
                console.error('Error restoring camera track:', error);
              }
            }
          }

          const audioSenders = pc.getSenders().filter(
            (s) => s.track?.kind === 'audio' && s.track?.label.includes('Screen')
          );
          audioSenders.forEach((sender) => {
            try {
              pc.removeTrack(sender);
            } catch (error) {
              console.error('Error removing screen share audio:', error);
            }
          });

          try {
            await restartPeerNegotiation(pc, async (offer) => {
              sendSignalingMessageRef.current({ type: 'offer', to: peerId, data: offer });
            });
          } catch (error) {
            console.warn('Screen share stop renegotiation failed:', error);
          }
        })
      );

      setIsScreenSharing(false);
      setScreenShareStream(null);
      
      toast({
        title: "Screen Share Stopped",
        description: "You have stopped sharing your screen"
      });
    }
  }, [isScreenSharing, toast]);

  const handleDeviceChange = useCallback(async (deviceId: string, kind: MediaDeviceKind) => {
    try {
      const constraints: MediaStreamConstraints = {
        video: kind === 'videoinput' ? { deviceId: { exact: deviceId } } : isVideoEnabled,
        audio: kind === 'audioinput' ? { deviceId: { exact: deviceId } } : isAudioEnabled,
      };
  
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
  
      // Update the appropriate device state
      if (kind === 'audioinput') {
        setCurrentAudioDevice(newStream.getAudioTracks()[0].label);
      } else if (kind === 'videoinput') {
        setCurrentVideoDevice(newStream.getVideoTracks()[0].label);
      }
  
      // Replace tracks in local stream
      localStreamRef.current?.getTracks().forEach(track => {
        track.stop();
        localStreamRef.current?.removeTrack(track);
      });
  
      newStream.getTracks().forEach(track => {
        localStreamRef.current?.addTrack(track);
      });
  
      setLocalStream(newStream);
      localStreamRef.current = newStream;
  
      // Notify remote peers about the change
      await Promise.all(
        Array.from(peerConnectionsRef.current.entries()).map(async ([peerId, pc]) => {
          await Promise.all(
            pc.getSenders().map(async (sender) => {
              if (sender.track?.kind === kind) {
                const newTrack = newStream.getTracks().find((track) => track.kind === kind);
                if (newTrack) {
                  await sender.replaceTrack(newTrack);
                }
              }
            })
          );
          try {
            await restartPeerNegotiation(pc, async (offer) => {
              sendSignalingMessageRef.current({ type: 'offer', to: peerId, data: offer });
            });
          } catch (error) {
            console.warn('Device change renegotiation failed:', error);
          }
        })
      );
    } catch (error) {
      console.error('Error changing device:', error);
      toast({
        title: "Error",
        description: "Failed to change device. Please check your permissions.",
        variant: "destructive"
      });
    }
  }, [isAudioEnabled, isVideoEnabled, toast]);

  const cleanup = useCallback(() => {
    console.log('Cleaning up WebRTC');

    cleanupSignaling();
    stopMonitoring();

    peerConnectionsRef.current.forEach(pc => {
      pc.close();
    });
    peerConnectionsRef.current.clear();
    setPeerConnections(new Map());

    remoteStreamsRef.current.forEach(stream => {
      stream.getTracks().forEach(track => track.stop());
    });
    remoteStreamsRef.current.clear();
    setRemoteStreams(new Map());

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
  }, [cleanupSignaling, stopMonitoring]);

    return {
    localStream,
    remoteStreams,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    screenShareStream,
    hostScreenStream,
    currentFacingMode,
    currentAudioDevice,
    currentVideoDevice,
    connectedPeers,
    peerUserNames,
    peerConnections,
    connectionQuality,
    isOptimizing,
    toggleVideo,
    toggleAudio,
    switchCamera,
    toggleScreenShare,
    handleDeviceChange,
    initialize,
    cleanup,
    setQualityOverride,
    optimizationSettings,
    shouldRenderVideo,
    setPlanLimits,
  };
};
