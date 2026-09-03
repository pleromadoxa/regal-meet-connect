import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWebRTCSignaling } from './useWebRTCSignaling';
import { useNetworkOptimization } from './useNetworkOptimization';
import { useConnectionManager } from './useConnectionManager';
import {
  createPeerConnectionQueue,
  getAudioConstraintsForParticipantCount,
  isScreenShareTrack,
  MEETING_LIMITS,
  peerConnectDelayForCount,
} from '@/lib/largeMeeting';
import { acquireUserMedia, getMediaAccessErrorInfo } from '@/lib/mediaAccess';
import { loadMeetingMediaPrefs } from '@/lib/meetingMediaPrefs';
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
import { clearOutgoingVideoTrack, replaceOrAddVideoTrack, syncLocalTracksToPeer } from '@/lib/videoPeerTrack';

export type { MeetingMediaRoutingOptions } from '@/lib/meetingTopology';

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join' | 'leave' | 'user-info' | 'audio-toggle' | 'speaking-state';
  data: any;
  from: string;
  to?: string;
  meetingId: string;
  userName?: string;
}

export const useAudioOnlyWebRTC = (
  meetingId: string,
  userName: string,
  userId: string,
  mediaRouting: MeetingMediaRoutingOptions = defaultMediaRouting
) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [currentAudioDevice, setCurrentAudioDevice] = useState<string>('');
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
  const [speakingParticipants, setSpeakingParticipants] = useState<Set<string>>(new Set());
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenShareStream, setScreenShareStream] = useState<MediaStream | null>(null);
  const [hostScreenStream, setHostScreenStream] = useState<MediaStream | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenShareStreamRef = useRef<MediaStream | null>(null);
  const syncHostScreenRef = useRef<() => void>(() => undefined);
  const peerQueueRef = useRef<ReturnType<typeof createPeerConnectionQueue> | null>(null);
  const createOfferRef = useRef<((remoteUserId: string) => Promise<void>) | null>(null);
  const mediaRoutingRef = useRef(mediaRouting);
  mediaRoutingRef.current = mediaRouting;
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const speakingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();

  // Network optimization hook - optimized for audio
  const {
    connectionQuality,
    isOptimizing,
    startMonitoring,
    stopMonitoring,
    setQualityOverride
  } = useNetworkOptimization();

  // Enhanced connection management optimized for audio
  const {
    getOptimizedRTCConfiguration,
    monitorConnectionHealth,
    handleConnectionRecovery,
    getAdaptiveMediaConstraints
  } = useConnectionManager({
    enableHeartbeat: true,
    heartbeatInterval: 3000, // Faster heartbeat for audio-only
    maxReconnectAttempts: 5   // More reconnect attempts for reliability
  });

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
      if (videoTrack) {
        setHostScreenStream(stream);
        return;
      }
    }
    if (!screenTrackRef.current) {
      setHostScreenStream(null);
    }
  }, []);

  syncHostScreenRef.current = syncHostScreenFromRemotes;

  // Update connected peers from signaling
  useEffect(() => {
    setConnectedPeers(Array.from(signalingPeers));
  }, [signalingPeers]);

  // Audio-optimized RTC configuration
  const getAudioOptimizedRTCConfiguration = () => {
    const baseConfig = getOptimizedRTCConfiguration();
    return {
      ...baseConfig,
      // Add audio-specific optimizations
      bundlePolicy: 'balanced' as RTCBundlePolicy,
      rtcpMuxPolicy: 'require' as RTCRtcpMuxPolicy,
      iceCandidatePoolSize: 4, // Smaller pool for audio-only
    };
  };

  // Speaking detection using Web Audio API
  const setupSpeakingDetection = useCallback((stream: MediaStream) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const audioContext = audioContextRef.current;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const checkSpeakingLevel = () => {
        if (!analyserRef.current) return;
        
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        const isSpeaking = average > 20; // Threshold for speaking detection
        
        // Broadcast speaking state
        sendSignalingMessageRef.current({
          type: 'speaking-state',
          data: { isSpeaking, level: average }
        });
      };

      // Check speaking level every 200ms
      speakingIntervalRef.current = setInterval(checkSpeakingLevel, 200);
      
    } catch (error) {
      console.error('Error setting up speaking detection:', error);
    }
  }, []);

  useEffect(() => {
    if (!meetingId || !userName || !userId) return;

    console.log('Initializing Audio-Only WebRTC for:', { meetingId, userName, userId });
    
    const signalingChannel = initializeSignalingRef.current();
    const pendingCandidatesRef = new Map<string, RTCIceCandidateInit[]>();
    const makingOfferRef = new Map<string, boolean>();

    const flushPendingCandidates = async (remoteUserId: string, pc: RTCPeerConnection) => {
      const queue = pendingCandidatesRef.get(remoteUserId) || [];
      while (queue.length) {
        const c = queue.shift()!;
        try {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        } catch (err) {
          console.warn('Failed to flush queued ICE candidate:', err);
        }
      }
    };

    const addVideoToPeerConnection = (pc: RTCPeerConnection) => {
      const publish = localStreamRef.current && mediaRoutingRef.current.publishToMesh !== false;
      const screenTrack = screenTrackRef.current;
      const screenStream = screenShareStreamRef.current;
      const cameraVideo = localStreamRef.current?.getVideoTracks().find(
        (t) => t.readyState === 'live' && t.enabled
      );

      if (publish) {
        if (screenTrack && screenStream) {
          pc.addTrack(screenTrack, screenStream);
        } else if (cameraVideo && localStreamRef.current) {
          pc.addTrack(cameraVideo, localStreamRef.current);
        } else {
          pc.addTransceiver('video', { direction: 'recvonly' });
        }
      } else {
        pc.addTransceiver('video', { direction: 'recvonly' });
      }
    };

    const createPeerConnection = (remoteUserId: string) => {
      console.log('Creating audio-only peer connection for:', remoteUserId);
      const pc = new RTCPeerConnection(getAudioOptimizedRTCConfiguration());

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignalingMessageRef.current({
            type: 'ice-candidate',
            to: remoteUserId,
            data: event.candidate
          });
        }
      };

      pc.ontrack = (event) => {
        console.log('Received remote audio stream:', event);
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
        if (pc.iceConnectionState === 'failed') {
          void restartPeerNegotiation(pc, async (offer) => {
            sendSignalingMessageRef.current({ type: 'offer', to: remoteUserId, data: offer });
          }, remoteUserId);
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('Audio peer connection state change:', pc.connectionState);
        const cleanupPeer = () => {
          cancelPeerDisconnectCleanup(remoteUserId);
          remoteStreamsRef.current.delete(remoteUserId);
          setRemoteStreams(new Map(remoteStreamsRef.current));
          peerConnectionsRef.current.delete(remoteUserId);
        };

        if (pc.connectionState === 'disconnected') {
          schedulePeerDisconnectCleanup(remoteUserId, () => {
            void restartPeerNegotiation(pc, async (offer) => {
              sendSignalingMessageRef.current({ type: 'offer', to: remoteUserId, data: offer });
            }, remoteUserId);
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
              void restartPeerNegotiation(pc, async (offer) => {
                sendSignalingMessageRef.current({ type: 'offer', to: remoteUserId, data: offer });
              }, remoteUserId);
            }
          });
          return;
        }

        if (pc.connectionState === 'closed') {
          cleanupPeer();
        }
      };

      // Add audio tracks for publishers; listeners receive only
      if (localStreamRef.current && mediaRoutingRef.current.publishToMesh !== false) {
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        if (audioTrack) {
          pc.addTrack(audioTrack, localStreamRef.current);
        }
      } else {
        pc.addTransceiver('audio', { direction: 'recvonly' });
      }

      addVideoToPeerConnection(pc);

      peerConnectionsRef.current.set(remoteUserId, pc);
      if (typeof window !== 'undefined') {
        (window as unknown as { __REGAL_PEER_CONNECTIONS__?: Map<string, RTCPeerConnection> })
          .__REGAL_PEER_CONNECTIONS__ = peerConnectionsRef.current;
      }

      // Start monitoring with audio-optimized settings
      startMonitoring(pc);
      monitorConnectionHealth(pc, remoteUserId);
      handleConnectionRecovery(pc, remoteUserId, () => {
        void restartPeerNegotiation(pc, async (offer) => {
          sendSignalingMessageRef.current({ type: 'offer', to: remoteUserId, data: offer });
        });
      });

      return pc;
    };

    const handleSignalingMessage = async (message: SignalingMessage) => {
      const remoteUserId = message.from;

      if (
        message.type !== 'leave' &&
        message.type !== 'rejoin' &&
        message.type !== 'speaking-state' &&
        message.type !== 'audio-toggle' &&
        (!mediaRoutingRef.current.useMesh || !mediaRoutingRef.current.shouldConnectToPeer(remoteUserId))
      ) {
        return;
      }

      if (message.type === 'offer') {
        console.log('Received audio offer from:', remoteUserId);
        let pc = peerConnectionsRef.current.get(remoteUserId);
        if (!pc) {
          pc = createPeerConnection(remoteUserId);
        }

        const polite = userId < remoteUserId;
        const offerCollision = makingOfferRef.get(remoteUserId) || pc.signalingState !== 'stable';
        if (offerCollision && !polite) {
          console.log('Impolite audio peer ignoring colliding offer from', remoteUserId);
          return;
        }

        try {
          if (offerCollision) {
            await Promise.all([
              pc.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit).catch(() => undefined),
              pc.setRemoteDescription(new RTCSessionDescription(message.data)),
            ]);
          } else {
            await pc.setRemoteDescription(new RTCSessionDescription(message.data));
          }
          await flushPendingCandidates(remoteUserId, pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          sendSignalingMessageRef.current({
            type: 'answer',
            to: remoteUserId,
            data: pc.localDescription
          });
        } catch (error) {
          console.error('Error handling audio offer:', error);
        }
      } else if (message.type === 'answer') {
        console.log('Received audio answer from:', remoteUserId);
        const pc = peerConnectionsRef.current.get(remoteUserId);
        if (pc && pc.signalingState === 'have-local-offer') {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(message.data));
            await flushPendingCandidates(remoteUserId, pc);
          } catch (error) {
            console.error('Error handling audio answer:', error);
          }
        }
      } else if (message.type === 'ice-candidate') {
        const pc = peerConnectionsRef.current.get(remoteUserId);
        if (!pc || !message.data) return;
        if (!pc.remoteDescription?.type) {
          const q = pendingCandidatesRef.get(remoteUserId) || [];
          q.push(message.data);
          pendingCandidatesRef.set(remoteUserId, q);
          return;
        }
        try {
          await pc.addIceCandidate(new RTCIceCandidate(message.data));
        } catch (error) {
          console.warn('Error adding ICE candidate:', error);
        }
      } else if (message.type === 'leave') {
        cancelPeerDisconnectCleanup(remoteUserId);
        console.log('Audio participant left:', remoteUserId);
        const pc = peerConnectionsRef.current.get(remoteUserId);
        if (pc) {
          pc.close();
          peerConnectionsRef.current.delete(remoteUserId);
          remoteStreamsRef.current.delete(remoteUserId);
          setRemoteStreams(new Map(remoteStreamsRef.current));
        }
        setSpeakingParticipants(prev => {
          const newSet = new Set(prev);
          newSet.delete(remoteUserId);
          return newSet;
        });
      } else if (message.type === 'rejoin') {
        cancelPeerDisconnectCleanup(remoteUserId);
        const existing = peerConnectionsRef.current.get(remoteUserId);
        if (existing) {
          existing.close();
          peerConnectionsRef.current.delete(remoteUserId);
        }
        if (localStreamRef.current && createOfferRef.current) {
          void createOfferRef.current(remoteUserId);
        }
      } else if (message.type === 'speaking-state') {
        console.log('Received speaking state from:', remoteUserId, message.data);
        const { isSpeaking } = message.data;
        
        setSpeakingParticipants(prev => {
          const newSet = new Set(prev);
          if (isSpeaking) {
            newSet.add(remoteUserId);
          } else {
            newSet.delete(remoteUserId);
          }
          return newSet;
        });
      } else if (message.type === 'audio-toggle') {
        console.log('Received audio toggle from:', remoteUserId, message.data.enabled);
        // Handle remote audio toggle if needed
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
      // Perfect negotiation: only lower userId initiates (avoids glare)
      if (!(userId < remoteUserId)) {
        console.log('Skipping audio offer initiation (other peer is initiator):', remoteUserId);
        if (!peerConnectionsRef.current.has(remoteUserId)) createPeerConnection(remoteUserId);
        return;
      }
      console.log('Creating audio offer for:', remoteUserId);
      if (peerConnectionsRef.current.has(remoteUserId)) {
        console.log('Audio peer connection already exists for:', remoteUserId);
        return;
      }

      const pc = createPeerConnection(remoteUserId);

      try {
        makingOfferRef.set(remoteUserId, true);
        const offer = await pc.createOffer();
        if (pc.signalingState !== 'stable') return;
        await pc.setLocalDescription(offer);

        sendSignalingMessageRef.current({
          type: 'offer',
          to: remoteUserId,
          data: pc.localDescription
        });
      } catch (error) {
        console.error('Error creating audio offer:', error);
      } finally {
        makingOfferRef.set(remoteUserId, false);
      }
    };

    createOfferRef.current = createOffer;

    peerQueueRef.current = createPeerConnectionQueue((peerId) => {
      if (createOfferRef.current) createOfferRef.current(peerId);
    }, peerConnectDelayForCount(signalingPeers.size + 1));

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
              
              toast({
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
      console.log('Cleaning up Audio-Only WebRTC listeners');
      clearAllPeerDisconnectTimers();
      supabase.removeChannel(muteChannel);
      window.removeEventListener('webrtc-signaling', handleWebRTCSignaling);
      createOfferRef.current = null;

      if (speakingIntervalRef.current) {
        clearInterval(speakingIntervalRef.current);
        speakingIntervalRef.current = null;
      }

      peerConnectionsRef.current.forEach(pc => {
        pc.close();
      });
      peerConnectionsRef.current.clear();
      peerQueueRef.current?.clear();

      remoteStreamsRef.current.forEach(stream => {
        stream.getTracks().forEach(track => track.stop());
      });
      remoteStreamsRef.current.clear();
      setRemoteStreams(new Map());
    };

    return cleanupListeners;
  }, [meetingId, userId]);

  // Handle peer connection setup when new peers join (staggered for stability)
  useEffect(() => {
    if (!mediaRouting.useMesh) {
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      peerQueueRef.current?.clear();
      remoteStreamsRef.current.clear();
      setRemoteStreams(new Map());
      return;
    }

    const handleNewPeers = () => {
      const count = signalingPeers.size + 1;
      peerQueueRef.current?.setDelay(peerConnectDelayForCount(count));
      const currentPeers = Array.from(signalingPeers);

      currentPeers.forEach((peerId) => {
        if (!mediaRoutingRef.current.shouldConnectToPeer(peerId)) return;
        if (!peerConnectionsRef.current.has(peerId) && localStreamRef.current) {
          if (count > MEETING_LIMITS.maxMeshPeerConnections) return;
          peerQueueRef.current?.enqueue(peerId);
        }
      });
    };

    if (signalingPeers.size > 0) {
      handleNewPeers();
    }
  }, [signalingPeers, mediaRouting.useMesh]);

  useEffect(() => {
    syncHostScreenFromRemotes();
  }, [remoteStreams, syncHostScreenFromRemotes]);

  // Reconnect all peers after network recovery or tab resume
  useEffect(() => {
    const reconnectAll = () => {
      if (!mediaRoutingRef.current.useMesh || !localStreamRef.current) return;
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
    };

    window.addEventListener('meeting-network-online', reconnectAll);
    window.addEventListener('meeting-visibility-resume', reconnectAll);
    return () => {
      window.removeEventListener('meeting-network-online', reconnectAll);
      window.removeEventListener('meeting-visibility-resume', reconnectAll);
    };
  }, [signalingPeers]);

  const initialize = useCallback(async () => {
    try {
      const peerCount = signalingPeers.size + 1;
      const prefs = await loadMeetingMediaPrefs(userId);
      const stream = await acquireUserMedia(
        {
          audio: getAudioConstraintsForParticipantCount(peerCount),
          video: false,
        },
        prefs
      );

      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsAudioEnabled(stream.getAudioTracks().length > 0);

      if (mediaRoutingRef.current.publishToMesh !== false) {
        for (const [peerId, pc] of peerConnectionsRef.current.entries()) {
          try {
            await syncLocalTracksToPeer(pc, stream);
          } catch (err) {
            console.warn('Failed syncing audio tracks to', peerId, err);
          }
        }
      }
      Array.from(signalingPeers).forEach((peerId) => {
        if (!mediaRoutingRef.current.shouldConnectToPeer(peerId)) return;
        if (!peerConnectionsRef.current.has(peerId)) {
          peerQueueRef.current?.enqueue(peerId);
        }
      });

      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        setCurrentAudioDevice(audioTrack.label);
      }

      setupSpeakingDetection(stream);
    } catch (error) {
      console.error('Error accessing audio device:', error);
      const info = getMediaAccessErrorInfo(error);
      toast({
        title: info.title,
        description: info.description,
        variant: 'destructive',
        duration: 8000,
      });
    }
  }, [toast, setupSpeakingDetection, signalingPeers.size, userId]);

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
  }, [isAudioEnabled, toast, sendSignalingMessage]);

  const renegotiateAllPeers = useCallback(async () => {
    await Promise.all(
      Array.from(peerConnectionsRef.current.entries()).map(async ([peerId, pc]) => {
        try {
          await restartPeerNegotiation(pc, async (offer) => {
            sendSignalingMessageRef.current({
              type: 'offer',
              to: peerId,
              data: offer,
            });
          });
        } catch (error) {
          console.warn('Peer renegotiation failed:', error);
        }
      })
    );
  }, []);

  const toggleCamera = useCallback(async (): Promise<boolean> => {
    if (!localStreamRef.current) return isVideoEnabled;

    const existingVideo = localStreamRef.current.getVideoTracks()[0];
    if (existingVideo && existingVideo.readyState === 'live') {
      existingVideo.stop();
      localStreamRef.current.removeTrack(existingVideo);
      setIsVideoEnabled(false);
      setLocalStream(new MediaStream([...localStreamRef.current.getTracks()]));

      await Promise.all(
        Array.from(peerConnectionsRef.current.entries()).map(async ([peerId, pc]) => {
          if (screenTrackRef.current) return;
          try {
            await clearOutgoingVideoTrack(pc);
          } catch (error) {
            console.warn('Failed to remove camera track from peer:', error);
          }
        })
      );
      if (!screenTrackRef.current) {
        await renegotiateAllPeers();
      }

      toast({
        title: 'Switched to audio-only',
        description: 'Your camera is now off',
      });
      return false;
    }

    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });
      const videoTrack = videoStream.getVideoTracks()[0];
      if (!videoTrack) throw new Error('No video track');

      localStreamRef.current.addTrack(videoTrack);
      setLocalStream(new MediaStream([...localStreamRef.current.getTracks()]));
      setIsVideoEnabled(true);

      await Promise.all(
        Array.from(peerConnectionsRef.current.entries()).map(async ([peerId, pc]) => {
          if (screenTrackRef.current) return;
          try {
            await replaceOrAddVideoTrack(pc, videoTrack, localStreamRef.current!);
          } catch (error) {
            console.warn('Failed to add camera track to peer:', error);
          }
        })
      );
      await renegotiateAllPeers();

      toast({
        title: 'Camera on',
        description: 'Video is now enabled',
      });
      return true;
    } catch (error) {
      console.error('Failed to enable camera:', error);
      toast({
        title: 'Camera failed',
        description: 'Could not access your camera. Check browser permissions.',
        variant: 'destructive',
      });
      return false;
    }
  }, [isVideoEnabled, toast, renegotiateAllPeers]);

  const toggleScreenShare = useCallback(
    async (onPresentationChange?: (active: boolean) => void) => {
      if (!isScreenSharing) {
        try {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              width: { ideal: 1920, max: 1920 },
              height: { ideal: 1080, max: 1080 },
              frameRate: { ideal: 15, max: 24 },
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              sampleRate: 48000,
            },
          });

          const screenTrack = displayStream.getVideoTracks()[0];
          if (!screenTrack) throw new Error('No screen track');

          screenTrackRef.current = screenTrack;
          screenShareStreamRef.current = displayStream;
          setScreenShareStream(displayStream);
          setIsScreenSharing(true);
          onPresentationChange?.(true);

          screenTrack.onended = async () => {
            setIsScreenSharing(false);
            setScreenShareStream(null);
            screenShareStreamRef.current = null;
            screenTrackRef.current = null;
            onPresentationChange?.(false);

            for (const [, pc] of peerConnectionsRef.current) {
              const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video');
              if (videoSender) {
                try {
                  await videoSender.replaceTrack(null);
                } catch (error) {
                  console.warn('Failed to clear screen share sender:', error);
                }
              }
            }
            await renegotiateAllPeers();
            syncHostScreenRef.current();
            toast({ title: 'Presentation ended', description: 'Screen sharing stopped.' });
          };

          await Promise.all(
            Array.from(peerConnectionsRef.current.entries()).map(async ([peerId, pc]) => {
              const existing = pc.getSenders().find((s) => s.track?.kind === 'video');
              if (existing) {
                await existing.replaceTrack(screenTrack);
              } else {
                pc.addTrack(screenTrack, displayStream);
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

          toast({
            title: 'Presenting to everyone',
            description: 'Participants see your screen only — no participant video.',
          });
        } catch (error) {
          console.error('Screen share failed:', error);
          toast({
            title: 'Screen share failed',
            description: 'Could not start presentation. Check browser permissions.',
            variant: 'destructive',
          });
        }
      } else {
        screenTrackRef.current?.stop();
        screenTrackRef.current = null;
        screenShareStreamRef.current = null;
        setScreenShareStream(null);
        setIsScreenSharing(false);
        onPresentationChange?.(false);

        await Promise.all(
          Array.from(peerConnectionsRef.current.entries()).map(async ([peerId, pc]) => {
            const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video');
            if (videoSender) {
              try {
                await videoSender.replaceTrack(null);
              } catch (error) {
                console.warn('Failed to stop screen share sender:', error);
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
              console.warn('Stop screen share renegotiation failed:', error);
            }
          })
        );

        syncHostScreenRef.current();
        toast({ title: 'Presentation stopped' });
      }
    },
    [isScreenSharing, toast, renegotiateAllPeers]
  );

  const handleDeviceChange = useCallback(async (deviceId: string, deviceType: 'audio' | 'video') => {
    if (deviceType !== 'audio' || !localStreamRef.current) return;

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: { 
          deviceId: { exact: deviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        }
      });

      const oldAudioTrack = localStreamRef.current.getAudioTracks()[0];
      const newAudioTrack = newStream.getAudioTracks()[0];

      if (newAudioTrack) {
        // Update peer connections
        peerConnectionsRef.current.forEach(async (pc) => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
          if (sender) {
            try {
              await sender.replaceTrack(newAudioTrack);
            } catch (error) {
              console.error('Error replacing audio track:', error);
            }
          }
        });

        // Update local stream
        if (oldAudioTrack) {
          localStreamRef.current.removeTrack(oldAudioTrack);
          oldAudioTrack.stop();
        }
        localStreamRef.current.addTrack(newAudioTrack);
        
        setLocalStream(new MediaStream([...localStreamRef.current.getTracks()]));
        setCurrentAudioDevice(newAudioTrack.label);

        // Setup speaking detection for new audio track
        setupSpeakingDetection(localStreamRef.current);

        toast({
          title: "Audio Device Changed",
          description: `Switched to ${newAudioTrack.label}`
        });
      }
    } catch (error) {
      console.error('Error changing audio device:', error);
      toast({
        title: "Device Change Failed",
        description: "Failed to change audio device. Please try again.",
        variant: "destructive"
      });
    }
  }, [toast, setupSpeakingDetection]);

  const cleanup = useCallback(() => {
    console.log('Cleaning up audio-only WebRTC hook');
    cleanupSignaling();
    
    // Cleanup speaking detection
    if (speakingIntervalRef.current) {
      clearInterval(speakingIntervalRef.current);
      speakingIntervalRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    
    // Cleanup connections
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
    peerQueueRef.current?.clear();

    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }
    screenShareStreamRef.current = null;
    setScreenShareStream(null);
    setHostScreenStream(null);
    setIsScreenSharing(false);

    remoteStreamsRef.current.forEach(stream => {
      stream.getTracks().forEach(track => track.stop());
    });
    remoteStreamsRef.current.clear();
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    setLocalStream(null);
    setRemoteStreams(new Map());
    setSpeakingParticipants(new Set());
    
    stopMonitoring();
  }, [stopMonitoring, cleanupSignaling]);

  return {
    localStream,
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    currentAudioDevice,
    toggleAudio,
    toggleCamera,
    isScreenSharing,
    screenShareStream,
    hostScreenStream,
    toggleScreenShare,
    handleDeviceChange,
    initialize,
    cleanup,
    connectedPeers,
    peerUserNames,
    connectionQuality,
    isOptimizing,
    setQualityOverride,
    speakingParticipants
  };
};