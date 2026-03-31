import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWebRTCSignaling } from './useWebRTCSignaling';
import { useNetworkOptimization } from './useNetworkOptimization';
import { useConnectionManager } from './useConnectionManager';

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join' | 'leave' | 'user-info' | 'audio-toggle' | 'speaking-state';
  data: any;
  from: string;
  to?: string;
  meetingId: string;
  userName?: string;
}

export const useAudioOnlyWebRTC = (meetingId: string, userName: string, userId: string) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [currentAudioDevice, setCurrentAudioDevice] = useState<string>('');
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
  const [speakingParticipants, setSpeakingParticipants] = useState<Set<string>>(new Set());

  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const createOfferRef = useRef<((remoteUserId: string) => Promise<void>) | null>(null);
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
        sendSignalingMessage({
          type: 'speaking-state',
          data: { isSpeaking, level: average }
        });
      };

      // Check speaking level every 200ms
      speakingIntervalRef.current = setInterval(checkSpeakingLevel, 200);
      
    } catch (error) {
      console.error('Error setting up speaking detection:', error);
    }
  }, [sendSignalingMessage]);

  useEffect(() => {
    if (!meetingId || !userName || !userId) return;

    console.log('Initializing Audio-Only WebRTC for:', { meetingId, userName, userId });
    
    const signalingChannel = initializeSignaling();

    const createPeerConnection = (remoteUserId: string) => {
      console.log('Creating audio-only peer connection for:', remoteUserId);
      const pc = new RTCPeerConnection(getAudioOptimizedRTCConfiguration());

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignalingMessage({
            type: 'ice-candidate',
            to: remoteUserId,
            data: event.candidate
          });
        }
      };

      pc.ontrack = (event) => {
        console.log('Received remote audio stream:', event);
        remoteStreamsRef.current.set(remoteUserId, event.streams[0]);
        setRemoteStreams(new Map(remoteStreamsRef.current));
      };

      pc.onconnectionstatechange = () => {
        console.log('Audio peer connection state change:', pc.connectionState);
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          console.log('Cleaning up audio peer connection for:', remoteUserId);
          remoteStreamsRef.current.delete(remoteUserId);
          setRemoteStreams(new Map(remoteStreamsRef.current));
          peerConnectionsRef.current.delete(remoteUserId);
        }
      };

      // Add only audio tracks for audio-only meeting
      if (localStreamRef.current) {
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        if (audioTrack) {
          pc.addTrack(audioTrack, localStreamRef.current);
        }
      }

      peerConnectionsRef.current.set(remoteUserId, pc);

      // Start monitoring with audio-optimized settings
      startMonitoring(pc);
      monitorConnectionHealth(pc, remoteUserId);
      handleConnectionRecovery(pc, remoteUserId);

      return pc;
    };

    const handleSignalingMessage = async (message: SignalingMessage) => {
      const remoteUserId = message.from;

      if (message.type === 'offer') {
        console.log('Received audio offer from:', remoteUserId);
        let pc = peerConnectionsRef.current.get(remoteUserId);
        if (!pc) {
          pc = createPeerConnection(remoteUserId);
          peerConnectionsRef.current.set(remoteUserId, pc);
        }

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(message.data));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(new RTCSessionDescription(answer));

          sendSignalingMessage({
            type: 'answer',
            to: remoteUserId,
            data: answer
          });
        } catch (error) {
          console.error('Error handling audio offer:', error);
        }
      } else if (message.type === 'answer') {
        console.log('Received audio answer from:', remoteUserId);
        const pc = peerConnectionsRef.current.get(remoteUserId);
        if (pc) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(message.data));
          } catch (error) {
            console.error('Error handling audio answer:', error);
          }
        }
      } else if (message.type === 'ice-candidate') {
        const pc = peerConnectionsRef.current.get(remoteUserId);
        if (pc && message.data) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(message.data));
          } catch (error) {
            console.error('Error adding ICE candidate:', error);
          }
        }
      } else if (message.type === 'leave') {
        console.log('Audio participant left:', remoteUserId);
        const pc = peerConnectionsRef.current.get(remoteUserId);
        if (pc) {
          pc.close();
          peerConnectionsRef.current.delete(remoteUserId);
          remoteStreamsRef.current.delete(remoteUserId);
          setRemoteStreams(new Map(remoteStreamsRef.current));
        }
        // Remove from speaking participants
        setSpeakingParticipants(prev => {
          const newSet = new Set(prev);
          newSet.delete(remoteUserId);
          return newSet;
        });
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
      console.log('Creating audio offer for:', remoteUserId);
      if (peerConnectionsRef.current.has(remoteUserId)) {
        console.log('Audio peer connection already exists for:', remoteUserId);
        return;
      }

      const pc = createPeerConnection(remoteUserId);
      peerConnectionsRef.current.set(remoteUserId, pc);

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(new RTCSessionDescription(offer));

        sendSignalingMessage({
          type: 'offer',
          to: remoteUserId,
          data: offer
        });
      } catch (error) {
        console.error('Error creating audio offer:', error);
      }
    };

    createOfferRef.current = createOffer;

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

    const cleanup = () => {
      console.log('Cleaning up Audio-Only WebRTC');
      cleanupSignaling();
      supabase.removeChannel(muteChannel);
      window.removeEventListener('webrtc-signaling', handleWebRTCSignaling);
      createOfferRef.current = null;

      // Cleanup speaking detection
      if (speakingIntervalRef.current) {
        clearInterval(speakingIntervalRef.current);
        speakingIntervalRef.current = null;
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      analyserRef.current = null;

      peerConnectionsRef.current.forEach(pc => {
        pc.close();
      });
      peerConnectionsRef.current.clear();

      remoteStreamsRef.current.forEach(stream => {
        stream.getTracks().forEach(track => track.stop());
      });
      remoteStreamsRef.current.clear();
      setRemoteStreams(new Map());

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }

      stopMonitoring();
    };

    return cleanup;
  }, [meetingId, userName, userId, toast, initializeSignaling, sendSignalingMessage, cleanupSignaling]);

  // Handle peer connection setup when new peers join
  useEffect(() => {
    const handleNewPeers = () => {
      const currentPeers = Array.from(signalingPeers);
      console.log('Current audio signaling peers:', currentPeers);
      
      currentPeers.forEach(peerId => {
        if (!peerConnectionsRef.current.has(peerId) && localStreamRef.current) {
          if (userId > peerId) {
            console.log(`[Polite Peer] I am caller. Creating audio offer for new peer:`, peerId);
            if (createOfferRef.current) {
              createOfferRef.current(peerId);
            }
          } else {
            console.log(`[Polite Peer] I am receiver. Waiting for audio offer from:`, peerId);
          }
        }
      });
    };

    if (signalingPeers.size > 0) {
      handleNewPeers();
    }
  }, [signalingPeers, userId]);

  const initialize = useCallback(async () => {
    try {
      // Audio-only constraints optimized for many participants
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // Enhanced audio settings for clarity
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000, // Higher quality audio
          channelCount: 1     // Mono for efficiency
        },
        video: false // No video for audio-only
      });

      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsAudioEnabled(stream.getAudioTracks().length > 0);

      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        setCurrentAudioDevice(audioTrack.label);
      }

      // Setup speaking detection
      setupSpeakingDetection(stream);

    } catch (error) {
      console.error('Error accessing audio device:', error);
      toast({
        title: "Error",
        description: "Failed to access microphone. Please check your permissions.",
        variant: "destructive"
      });
    }
  }, [toast, getAdaptiveMediaConstraints, connectionQuality.metrics.qualityLevel, setupSpeakingDetection]);

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
  }, [stopMonitoring]);

  return {
    localStream,
    remoteStreams,
    isAudioEnabled,
    currentAudioDevice,
    toggleAudio,
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