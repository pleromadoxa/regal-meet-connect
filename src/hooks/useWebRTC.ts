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
  const signalingRef = useRef(useWebRTCSignaling(meetingId, userId, userName));
  const { toast } = useToast();

  useEffect(() => {
    if (!meetingId || !userName || !userId) return;

    console.log('Initializing WebRTC for:', { meetingId, userName, userId });
    
    const { initializeSignaling, sendSignalingMessage, cleanup: cleanupSignaling } = signalingRef.current;
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

    window.addEventListener('webrtc-signaling', (event: any) => {
      handleSignalingMessage(event.detail);
    });

    const createOffer = async (remoteUserId: string) => {
      console.log('Creating offer for:', remoteUserId);
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

    signalingChannel.on('presence', { event: 'sync' }, () => {
      const presenceState = signalingChannel.presenceState();
      const peers = Object.keys(presenceState).filter(id => id !== userId);
      setConnectedPeers(peers);
      peers.forEach(peerId => {
        if (!peerConnectionsRef.current.has(peerId)) {
          createOffer(peerId);
        }
      });
    });

    signalingChannel.on('presence', { event: 'join' }, ({ key }: { key: string }) => {
      if (key !== userId) {
        setConnectedPeers(prev => [...prev, key]);
        createOffer(key);
      }
    });

    signalingChannel.on('presence', { event: 'leave' }, ({ key }: { key: string }) => {
      if (key !== userId) {
        setConnectedPeers(prev => prev.filter(id => id !== key));
        const pc = peerConnectionsRef.current.get(key);
        if (pc) {
          pc.close();
          peerConnectionsRef.current.delete(key);
          remoteStreamsRef.current.delete(key);
          setRemoteStreams(new Map(remoteStreamsRef.current));
        }
      }
    });

    // Add listener for host mute commands
    const handleHostMute = (event: CustomEvent) => {
      const { participantId, isMuted, fromHost } = event.detail;
      
      if (participantId === userId && fromHost) {
        console.log('Received mute command from host:', isMuted);
        
        if (localStreamRef.current) {
          const audioTrack = localStreamRef.current.getAudioTracks()[0];
          if (audioTrack) {
            audioTrack.enabled = !isMuted;
            setIsAudioEnabled(!isMuted);
            
            // Update UI to reflect the change
            toast({
              title: isMuted ? "You have been muted by the host" : "You have been unmuted by the host",
              description: isMuted ? "Your microphone is now muted" : "Your microphone is now active",
              variant: isMuted ? "destructive" : "default"
            });
          }
        }
      }
    };

    // Listen for host mute commands
    const muteChannel = supabase.channel(`meeting-mute-${userId}`);
    muteChannel
      .on('broadcast', { event: 'mute-toggle' }, (payload) => {
        handleHostMute(new CustomEvent('host-mute', { detail: payload.payload }));
      })
      .subscribe();

    const cleanup = () => {
      console.log('Cleaning up WebRTC');
      cleanupSignaling();
      supabase.removeChannel(muteChannel);
      window.removeEventListener('webrtc-signaling', handleSignalingMessage as any);

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

    return () => {
      console.log('Cleaning up WebRTC');
      cleanupSignaling();
      supabase.removeChannel(muteChannel);
      window.removeEventListener('webrtc-signaling', handleSignalingMessage as any);

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
  }, [meetingId, userName, userId]);

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

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        const newEnabled = !track.enabled;
        track.enabled = newEnabled;
        setIsVideoEnabled(newEnabled);
        
        console.log('Video toggled:', newEnabled);
      });
    }
  }, []);

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        const newEnabled = !audioTrack.enabled;
        audioTrack.enabled = newEnabled;
        setIsAudioEnabled(newEnabled);
        
        console.log('Audio toggled:', newEnabled);
        
        // Send audio state to other participants
        if (signalingRef.current.sendSignalingMessage) {
          signalingRef.current.sendSignalingMessage({
            type: 'audio-toggle',
            data: { enabled: newEnabled }
          });
        }
        
        toast({
          title: newEnabled ? "Microphone On" : "Microphone Off",
          description: newEnabled ? "You are now unmuted" : "You are now muted"
        });
      }
    }
  }, [toast]);

  const switchCamera = useCallback(() => {
    const newFacingMode: "user" | "environment" = currentFacingMode === 'user' ? 'environment' : 'user';
    setCurrentFacingMode(newFacingMode);
  }, [currentFacingMode]);

  const toggleScreenShare = useCallback(async () => {
    if (!isScreenSharing) {
      try {
        const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
        screenTrackRef.current = stream.getVideoTracks()[0];

        screenTrackRef.current.onended = () => {
          console.log('Screen sharing stopped by user');
          toggleScreenShare();
        };

        peerConnectionsRef.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video' && s.track?.label === 'FaceTime HD Camera');
          if (sender) {
            pc.removeTrack(sender);
          }
          pc.addTrack(screenTrackRef.current!, localStreamRef.current!);
        });

        setIsScreenSharing(true);
      } catch (error) {
        console.error('Error accessing display media:', error);
        toast({
          title: "Error",
          description: "Failed to share screen. Please check your permissions.",
          variant: "destructive"
        });
      }
    } else {
      peerConnectionsRef.current.forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video' && s.track?.label === 'Screen Sharing');
        if (sender) {
          pc.removeTrack(sender);
        }
        localStreamRef.current?.getVideoTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current!);
        });
      });

      screenTrackRef.current?.stop();
      screenTrackRef.current = null;
      setIsScreenSharing(false);
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

    if (signalingRef.current) {
      signalingRef.current.cleanup();
    }

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
  }, []);

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
