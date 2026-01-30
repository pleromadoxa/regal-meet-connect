import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWebRTCSignaling } from './useWebRTCSignaling';
import { useNetworkOptimization } from './useNetworkOptimization';
import { useBandwidthAware } from './useBandwidthAware';
import { usePageVisibility } from './usePageVisibility';
import { useConnectionManager } from './useConnectionManager';
import { useManyParticipantsOptimization } from './useManyParticipantsOptimization';

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join' | 'leave' | 'user-info' | 'audio-toggle';
  data: RTCSessionDescriptionInit | RTCIceCandidateInit | { enabled: boolean } | any;
  from: string;
  to?: string;
  meetingId: string;
  userName?: string;
}

export const useWebRTC = (
  meetingId: string,
  userName: string,
  userId: string,
  initialVideoEnabled: boolean = true,
  initialAudioEnabled: boolean = true
) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isVideoEnabled, setIsVideoEnabled] = useState(initialVideoEnabled);
  const [isAudioEnabled, setIsAudioEnabled] = useState(initialAudioEnabled);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [currentFacingMode, setCurrentFacingMode] = useState<"user" | "environment">('user');
  const [currentAudioDevice, setCurrentAudioDevice] = useState<string>('');
  const [currentVideoDevice, setCurrentVideoDevice] = useState<string>('');
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);

  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const createOfferRef = useRef<((remoteUserId: string) => Promise<void>) | null>(null);
  const { toast } = useToast();

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
    maxReconnectAttempts: 3
  });

  // Many participants optimization
  const {
    optimizationSettings,
    updateParticipantCount,
    getOptimizedMediaConstraints,
    applyOptimizedBitrate,
    shouldRenderVideo
  } = useManyParticipantsOptimization();

  // Use the signaling hook
  const { 
    initializeSignaling, 
    sendSignalingMessage, 
    connectedPeers: signalingPeers,
    peerUserNames,
    cleanup: cleanupSignaling 
  } = useWebRTCSignaling(meetingId, userId, userName);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          // Attempt to restart ICE if connection is degraded
          if (pc.connectionState === 'disconnected') {
            pc.restartIce();
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
    
    const signalingChannel = initializeSignaling();

    const createPeerConnection = (remoteUserId: string) => {
      console.log('Creating peer connection for:', remoteUserId);
      const pc = new RTCPeerConnection(getOptimizedRTCConfiguration());

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
        console.log('Received remote stream track:', event);
        remoteStreamsRef.current.set(remoteUserId, event.streams[0]);
        setRemoteStreams(new Map(remoteStreamsRef.current));
      };

      pc.onconnectionstatechange = () => {
        console.log('Peer connection state change:', pc.connectionState);
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          console.log('Cleaning up peer connection for:', remoteUserId);
          remoteStreamsRef.current.delete(remoteUserId);
          setRemoteStreams(new Map(remoteStreamsRef.current));
          peerConnectionsRef.current.delete(remoteUserId);
        }
      };

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      peerConnectionsRef.current.set(remoteUserId, pc);

      // Start network monitoring and connection health checks
      startMonitoring(pc);
      monitorConnectionHealth(pc, remoteUserId);
      handleConnectionRecovery(pc, remoteUserId);

      return pc;
    };

    const handleSignalingMessage = async (message: SignalingMessage) => {
      const remoteUserId = message.from;

      if (message.type === 'offer') {
        console.log('Received offer from:', remoteUserId);
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
          console.error('Error handling offer:', error);
        }
      } else if (message.type === 'answer') {
        console.log('Received answer from:', remoteUserId);
        const pc = peerConnectionsRef.current.get(remoteUserId);
        if (pc) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(message.data));
          } catch (error) {
            console.error('Error handling answer:', error);
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
        console.log('Received leave from:', remoteUserId);
        const pc = peerConnectionsRef.current.get(remoteUserId);
        if (pc) {
          pc.close();
          peerConnectionsRef.current.delete(remoteUserId);
          remoteStreamsRef.current.delete(remoteUserId);
          setRemoteStreams(new Map(remoteStreamsRef.current));
        }
      } else if (message.type === 'audio-toggle') {
        console.log('Received audio toggle from:', remoteUserId, message.data.enabled);
        // Handle audio toggle event if needed
      }
    };

    const handleWebRTCSignaling = (event: any) => {
      handleSignalingMessage(event.detail);
    };

    window.addEventListener('webrtc-signaling', handleWebRTCSignaling);

    const createOffer = async (remoteUserId: string) => {
      console.log('Creating offer for:', remoteUserId);
      if (peerConnectionsRef.current.has(remoteUserId)) {
        console.log('Peer connection already exists for:', remoteUserId);
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
        console.error('Error creating offer:', error);
      }
    };

    // Store createOffer function for access in other effects
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
      console.log('Cleaning up WebRTC listeners');
      cleanupSignaling();
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

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
    };

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId, userName, userId, toast, initializeSignaling, sendSignalingMessage, cleanupSignaling]);

  // Handle peer connection setup when new peers join
  useEffect(() => {
    const handleNewPeers = () => {
      const currentPeers = Array.from(signalingPeers);
      console.log('Current signaling peers:', currentPeers);
      
      currentPeers.forEach(peerId => {
        if (!peerConnectionsRef.current.has(peerId) && localStreamRef.current) {
          console.log('Creating offer for new peer:', peerId);
          if (createOfferRef.current) {
            createOfferRef.current(peerId);
          }
        }
      });
    };

    if (signalingPeers.size > 0) {
      handleNewPeers();
    }
  }, [signalingPeers]);

  const initialize = useCallback(async () => {
    try {
      console.log('🎥 Initializing WebRTC media...');
      
      // Get optimized constraints based on current participant count
      const constraints = getOptimizedMediaConstraints(true);
      console.log('📋 Using media constraints:', constraints);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ Got media stream:', {
        id: stream.id,
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
        videoSettings: stream.getVideoTracks()[0]?.getSettings(),
        audioSettings: stream.getAudioTracks()[0]?.getSettings()
      });

      // Apply initial state
      stream.getVideoTracks().forEach(track => {
        track.enabled = initialVideoEnabled;
      });
      stream.getAudioTracks().forEach(track => {
        track.enabled = initialAudioEnabled;
      });

      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsVideoEnabled(initialVideoEnabled);
      setIsAudioEnabled(initialAudioEnabled);

      const audioTrack = stream.getAudioTracks()[0];
      const videoTrack = stream.getVideoTracks()[0];

      if (audioTrack) {
        setCurrentAudioDevice(audioTrack.label);
        console.log('🎤 Audio track ready:', audioTrack.label);
      }

      if (videoTrack) {
        setCurrentVideoDevice(videoTrack.label);
        console.log('📹 Video track ready:', videoTrack.label);
      }

      console.log('🚀 WebRTC media initialization complete');
    } catch (error) {
      console.error('❌ WebRTC initialization failed:', error);
      toast({
        title: "Media Access Error",
        description: "Failed to access camera and microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  }, [toast, getOptimizedMediaConstraints, optimizationSettings.participantCount, initialAudioEnabled, initialVideoEnabled]);

  const toggleVideo = useCallback(async (): Promise<boolean> => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      let newEnabled = false;
      videoTracks.forEach(track => {
        newEnabled = !track.enabled;
        track.enabled = newEnabled;
        setIsVideoEnabled(newEnabled);
        
        console.log('Video toggled:', newEnabled);
      });
      return newEnabled;
    }
    return isVideoEnabled;
  }, [isVideoEnabled]);

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
          
          // Handle screen share ending
          screenTrack.onended = () => {
            console.log('Screen sharing stopped by user');
            setIsScreenSharing(false);
            
            // Restore camera video for all peer connections
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

          // Replace video track in all peer connections with screen share
          peerConnectionsRef.current.forEach(async (pc) => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
              try {
                await sender.replaceTrack(screenTrack);
                console.log('Replaced video track with screen share for peer connection');
              } catch (error) {
                console.error('Error replacing track with screen share:', error);
              }
            }
          });

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
      peerConnectionsRef.current.forEach(async (pc) => {
        const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (videoSender && localStreamRef.current) {
          const cameraTrack = localStreamRef.current.getVideoTracks()[0];
          if (cameraTrack) {
            try {
              await videoSender.replaceTrack(cameraTrack);
              console.log('Restored camera track for peer connection');
            } catch (error) {
              console.error('Error restoring camera track:', error);
            }
          }
        }
        
        // Remove any screen share audio tracks
        const audioSenders = pc.getSenders().filter(s => s.track?.kind === 'audio' && s.track?.label.includes('Screen'));
        audioSenders.forEach(sender => {
          try {
            pc.removeTrack(sender);
            console.log('Removed screen share audio track');
          } catch (error) {
            console.error('Error removing screen share audio:', error);
          }
        });
      });

      setIsScreenSharing(false);
      
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
      peerConnectionsRef.current.forEach(pc => {
        pc.getSenders().forEach(sender => {
          if (sender.track?.kind === kind) {
            const newTrack = newStream.getTracks().find(track => track.kind === kind);
            if (newTrack) {
              sender.replaceTrack(newTrack);
            }
          }
        });
      });
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

    remoteStreamsRef.current.forEach(stream => {
      stream.getTracks().forEach(track => track.stop());
    });
    remoteStreamsRef.current.clear();
    setRemoteStreams(new Map());

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
  }, [cleanupSignaling, stopMonitoring]);

    return {
    localStream,
    remoteStreams,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    currentFacingMode,
    currentAudioDevice,
    currentVideoDevice,
    connectedPeers,
    peerUserNames,
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
    shouldRenderVideo
  };
};
