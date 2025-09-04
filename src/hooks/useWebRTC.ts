import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWebRTCSignaling } from './useWebRTCSignaling';

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join' | 'leave' | 'user-info' | 'audio-toggle';
  data: any;
  from: string;
  to?: string;
  meetingId: string;
  userName?: string;
}

export const useWebRTC = (meetingId: string, userName: string, userId: string) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
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

  useEffect(() => {
    if (!meetingId || !userName || !userId) return;

    console.log('Initializing WebRTC for:', { meetingId, userName, userId });
    
    const signalingChannel = initializeSignaling();

    const createPeerConnection = (remoteUserId: string) => {
      console.log('Creating peer connection for:', remoteUserId);
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
        ]
      });

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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: currentFacingMode },
        audio: true,
      });

      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsVideoEnabled(stream.getVideoTracks().length > 0);
      setIsAudioEnabled(stream.getAudioTracks().length > 0);

      const audioTrack = stream.getAudioTracks()[0];
      const videoTrack = stream.getVideoTracks()[0];

      if (audioTrack) {
        setCurrentAudioDevice(audioTrack.label);
      }
      if (videoTrack) {
        setCurrentVideoDevice(videoTrack.label);
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast({
        title: "Error",
        description: "Failed to access media devices. Please check your permissions.",
        variant: "destructive"
      });
    }
  }, [currentFacingMode, toast]);

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

  const switchCamera = useCallback(() => {
    const newFacingMode: "user" | "environment" = currentFacingMode === 'user' ? 'environment' : 'user';
    setCurrentFacingMode(newFacingMode);
  }, [currentFacingMode]);

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
  }, [cleanupSignaling]);

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
    toggleVideo,
    toggleAudio,
    switchCamera,
    toggleScreenShare,
    handleDeviceChange,
    initialize,
    cleanup
  };
};
