import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useWebRTCSignaling } from './useWebRTCSignaling';

interface RemoteStream {
  id: string;
  stream: MediaStream;
  userName: string;
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:global.stun.twilio.com:3478' }
];

export const useWebRTC = (meetingId: string, userName: string, userId: string) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [currentFacingMode, setCurrentFacingMode] = useState<'user' | 'environment'>('user');
  const [currentAudioDevice, setCurrentAudioDevice] = useState<string>('');
  const [currentVideoDevice, setCurrentVideoDevice] = useState<string>('');
  const [connectionRetries, setConnectionRetries] = useState<Map<string, number>>(new Map());
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const reconnectTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const streamUpdateInProgress = useRef<boolean>(false);
  const { toast } = useToast();

  const { initializeSignaling, sendSignalingMessage, connectedPeers, peerUserNames, cleanup: cleanupSignaling } = 
    useWebRTCSignaling(meetingId, userId, userName);

  // Check if device supports screen sharing
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const getMediaConstraints = (facingMode: 'user' | 'environment' = 'user', audioDeviceId?: string, videoDeviceId?: string) => ({
    video: videoDeviceId ? 
      { deviceId: { exact: videoDeviceId } } : 
      {
        width: { ideal: isMobile() ? 640 : 1280, max: 1920, min: 320 },
        height: { ideal: isMobile() ? 480 : 720, max: 1080, min: 240 },
        frameRate: { ideal: isMobile() ? 15 : 30, max: 60, min: 10 },
        facingMode: facingMode,
        aspectRatio: { ideal: 16/9 }
      },
    audio: audioDeviceId ? 
      { deviceId: { exact: audioDeviceId } } : 
      {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: { ideal: 44100, min: 16000 },
        channelCount: { ideal: 1, min: 1 }
      }
  });

  const requestMediaPermissions = async (facingMode: 'user' | 'environment' = 'user', audioDeviceId?: string, videoDeviceId?: string) => {
    if (streamUpdateInProgress.current) {
      console.log('Stream update already in progress, skipping...');
      return localStreamRef.current;
    }

    streamUpdateInProgress.current = true;

    try {
      const constraints = getMediaConstraints(facingMode, audioDeviceId, videoDeviceId);
      console.log('Requesting media permissions with constraints:', constraints);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Stop previous stream tracks properly
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log(`Stopped ${track.kind} track`);
        });
      }
      
      localStreamRef.current = stream;
      setLocalStream(stream);
      setCurrentFacingMode(facingMode);
      
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        setCurrentVideoDevice(settings.deviceId || '');
        setIsVideoEnabled(videoTrack.enabled);
      }
      if (audioTrack) {
        const settings = audioTrack.getSettings();
        setCurrentAudioDevice(settings.deviceId || '');
        setIsAudioEnabled(audioTrack.enabled);
      }
      
      console.log('Media permissions granted:', {
        video: stream.getVideoTracks().length > 0,
        audio: stream.getAudioTracks().length > 0,
        videoSettings: videoTrack?.getSettings(),
        audioSettings: audioTrack?.getSettings()
      });
      
      // Update all peer connections with new stream - avoid duplicate streams
      await Promise.all(
        Array.from(peerConnections.current.entries()).map(async ([peerId, pc]) => {
          if (pc.connectionState === 'connected' || pc.connectionState === 'connecting') {
            console.log('Updating peer connection with new stream for:', peerId);
            
            // Get current senders
            const senders = pc.getSenders();
            
            // Replace tracks instead of removing/adding to prevent glitching
            for (const track of stream.getTracks()) {
              const sender = senders.find(s => s.track?.kind === track.kind);
              if (sender) {
                try {
                  await sender.replaceTrack(track);
                  console.log(`Replaced ${track.kind} track for peer ${peerId}`);
                } catch (error) {
                  console.warn(`Failed to replace ${track.kind} track:`, error);
                  // Fallback: add track if replace fails
                  pc.addTrack(track, stream);
                }
              } else {
                pc.addTrack(track, stream);
                console.log(`Added new ${track.kind} track for peer ${peerId}`);
              }
            }
          }
        })
      );
      
      streamUpdateInProgress.current = false;
      return stream;
    } catch (error: any) {
      streamUpdateInProgress.current = false;
      console.error('Error accessing media devices:', error);
      
      let errorMessage = "Unable to access camera/microphone.";
      if (error.name === 'NotAllowedError') {
        errorMessage = "Camera/microphone access denied. Please allow permissions and try again.";
      } else if (error.name === 'NotFoundError') {
        errorMessage = "No camera or microphone found.";
      } else if (error.name === 'NotReadableError') {
        errorMessage = "Camera/microphone is already in use by another application.";
      } else if (error.name === 'OverconstrainedError') {
        try {
          console.log('Falling back to basic constraints');
          const basicStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: true
          });
          
          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
          }
          
          localStreamRef.current = basicStream;
          setLocalStream(basicStream);
          return basicStream;
        } catch (fallbackError) {
          errorMessage = "Unable to access camera/microphone with current settings.";
        }
      }
      
      toast({
        title: "Permission Error",
        description: errorMessage,
        variant: "destructive"
      });
      throw error;
    }
  };

  const createPeerConnection = useCallback((remotePeerId: string) => {
    console.log('Creating peer connection for:', remotePeerId);
    
    // Prevent duplicate connections
    if (peerConnections.current.has(remotePeerId)) {
      console.log('Peer connection already exists for:', remotePeerId);
      return peerConnections.current.get(remotePeerId)!;
    }

    const peerConnection = new RTCPeerConnection({ 
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    });

    if (localStreamRef.current) {
      console.log('Adding local tracks to peer connection for:', remotePeerId);
      localStreamRef.current.getTracks().forEach(track => {
        console.log('Adding track:', track.kind, track.enabled);
        const sender = peerConnection.addTrack(track, localStreamRef.current!);
        
        if (track.kind === 'video') {
          const params = sender.getParameters();
          if (params.encodings.length === 0) {
            params.encodings.push({});
          }
          params.encodings[0] = {
            ...params.encodings[0],
            maxBitrate: isMobile() ? 1000000 : 2500000,
            scaleResolutionDownBy: isMobile() ? 2 : 1
          };
          sender.setParameters(params).catch(console.warn);
        }
      });
    }

    peerConnection.ontrack = (event) => {
      console.log('Received remote stream from:', remotePeerId, event);
      const [remoteStream] = event.streams;
      
      if (remoteStream && remoteStream.getTracks().length > 0) {
        console.log('Remote stream tracks:', remoteStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));
        
        // Prevent adding duplicate streams and reduce glitching
        setRemoteStreams(prev => {
          const existing = prev.find(s => s.id === remotePeerId);
          const peerName = peerUserNames.get(remotePeerId) || `User ${remotePeerId.slice(-4)}`;
          
          if (existing) {
            // Only update if the stream is actually different
            if (existing.stream.id !== remoteStream.id) {
              console.log('Updating existing remote stream for:', remotePeerId);
              return prev.map(s => 
                s.id === remotePeerId 
                  ? { ...s, stream: remoteStream, userName: peerName }
                  : s
              );
            }
            return prev; // No change needed
          }
          
          console.log('Adding new remote stream for:', remotePeerId);
          return [...prev, { 
            id: remotePeerId, 
            stream: remoteStream, 
            userName: peerName
          }];
        });
      } else {
        console.warn('Received empty or invalid remote stream from:', remotePeerId);
      }
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate to:', remotePeerId);
        sendSignalingMessage({
          type: 'ice-candidate',
          data: event.candidate,
          to: remotePeerId
        });
      }
    };

    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      console.log(`Connection state with ${remotePeerId}:`, state);
      
      if (state === 'failed' || state === 'disconnected') {
        console.log('Connection failed/disconnected, attempting to reconnect');
        handleReconnection(remotePeerId);
      } else if (state === 'connected') {
        console.log('Peer connected successfully');
        setConnectionRetries(prev => {
          const newMap = new Map(prev);
          newMap.delete(remotePeerId);
          return newMap;
        });
        const timeout = reconnectTimeouts.current.get(remotePeerId);
        if (timeout) {
          clearTimeout(timeout);
          reconnectTimeouts.current.delete(remotePeerId);
        }
      }
    };

    peerConnections.current.set(remotePeerId, peerConnection);
    return peerConnection;
  }, [sendSignalingMessage, peerUserNames]);

  const handleReconnection = useCallback((peerId: string) => {
    const currentRetries = connectionRetries.get(peerId) || 0;
    const maxRetries = 3;
    
    if (currentRetries >= maxRetries) {
      console.log(`Max reconnection attempts reached for ${peerId}`);
      setRemoteStreams(prev => prev.filter(s => s.id !== peerId));
      return;
    }

    setConnectionRetries(prev => {
      const newMap = new Map(prev);
      newMap.set(peerId, currentRetries + 1);
      return newMap;
    });

    const existingPc = peerConnections.current.get(peerId);
    if (existingPc) {
      existingPc.close();
      peerConnections.current.delete(peerId);
    }

    const timeout = setTimeout(() => {
      console.log(`Attempting reconnection ${currentRetries + 1}/${maxRetries} for ${peerId}`);
      initiateCallToPeer(peerId);
      reconnectTimeouts.current.delete(peerId);
    }, 2000 * (currentRetries + 1));

    reconnectTimeouts.current.set(peerId, timeout);
  }, [connectionRetries]);

  const handleSignalingMessage = useCallback(async (message: any) => {
    const { type, data, from } = message;
    console.log('Handling signaling message:', type, 'from:', from);

    try {
      switch (type) {
        case 'offer':
          console.log('Received offer from:', from);
          const pc1 = createPeerConnection(from);
          await pc1.setRemoteDescription(new RTCSessionDescription(data));
          const answer = await pc1.createAnswer();
          await pc1.setLocalDescription(answer);
          console.log('Sending answer to:', from);
          sendSignalingMessage({
            type: 'answer',
            data: answer,
            to: from
          });
          break;

        case 'answer':
          console.log('Received answer from:', from);
          const pc2 = peerConnections.current.get(from);
          if (pc2 && pc2.signalingState === 'have-local-offer') {
            await pc2.setRemoteDescription(new RTCSessionDescription(data));
            console.log('Set remote description for answer from:', from);
          } else {
            console.warn('Cannot set remote description - wrong state:', pc2?.signalingState);
          }
          break;

        case 'ice-candidate':
          console.log('Received ICE candidate from:', from);
          const pc3 = peerConnections.current.get(from);
          if (pc3 && pc3.remoteDescription) {
            await pc3.addIceCandidate(new RTCIceCandidate(data));
            console.log('Added ICE candidate from:', from);
          } else {
            console.warn('Cannot add ICE candidate - no remote description set');
          }
          break;
      }
    } catch (error) {
      console.error('Error handling signaling message:', error);
    }
  }, [createPeerConnection, sendSignalingMessage]);

  const initiateCallToPeer = useCallback(async (peerId: string) => {
    try {
      console.log('Initiating call to peer:', peerId);
      const peerConnection = createPeerConnection(peerId);
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      console.log('Sending offer to:', peerId);
      sendSignalingMessage({
        type: 'offer',
        data: offer,
        to: peerId
      });
    } catch (error) {
      console.error('Error initiating call to peer:', error);
    }
  }, [createPeerConnection, sendSignalingMessage]);

  useEffect(() => {
    const handleSignaling = (event: any) => {
      handleSignalingMessage(event.detail);
    };

    window.addEventListener('webrtc-signaling', handleSignaling);
    return () => window.removeEventListener('webrtc-signaling', handleSignaling);
  }, [handleSignalingMessage]);

  useEffect(() => {
    connectedPeers.forEach(peerId => {
      if (!peerConnections.current.has(peerId)) {
        console.log('New peer detected, initiating call:', peerId);
        initiateCallToPeer(peerId);
      }
    });

    setRemoteStreams(prev => 
      prev.map(stream => ({
        ...stream,
        userName: peerUserNames.get(stream.id) || stream.userName
      }))
    );
  }, [connectedPeers, initiateCallToPeer, peerUserNames]);

  const initialize = async () => {
    try {
      console.log('Initializing WebRTC...');
      await requestMediaPermissions();
      initializeSignaling();
      
      toast({
        title: "Connected",
        description: "Successfully joined the meeting!"
      });
      
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
    }
  };

  const handleDeviceChange = async (type: 'audio' | 'video', deviceId: string) => {
    try {
      console.log('Changing device:', type, deviceId);
      if (type === 'audio') {
        await requestMediaPermissions(currentFacingMode, deviceId, currentVideoDevice);
      } else {
        await requestMediaPermissions(currentFacingMode, currentAudioDevice, deviceId);
      }
      
      toast({
        title: "Device Changed",
        description: `${type === 'audio' ? 'Microphone' : 'Camera'} updated successfully`
      });
    } catch (error) {
      console.error('Failed to change device:', error);
      toast({
        title: "Device Change Failed",
        description: `Unable to switch ${type}`,
        variant: "destructive"
      });
    }
  };

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        
        console.log('Video toggled:', videoTrack.enabled);
        
        toast({
          title: videoTrack.enabled ? "Camera On" : "Camera Off",
          description: `Video ${videoTrack.enabled ? 'enabled' : 'disabled'}`
        });
      }
    }
  }, [toast]);

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        
        console.log('Audio toggled:', audioTrack.enabled);
        
        toast({
          title: audioTrack.enabled ? "Microphone On" : "Microphone Off",
          description: `Audio ${audioTrack.enabled ? 'enabled' : 'disabled'}`
        });
      }
    }
  }, [toast]);

  const switchCamera = useCallback(async () => {
    if (isScreenSharing) {
      toast({
        title: "Cannot Switch Camera",
        description: "Stop screen sharing first",
        variant: "destructive"
      });
      return;
    }

    try {
      const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
      await requestMediaPermissions(newFacingMode, currentAudioDevice, currentVideoDevice);
      
      toast({
        title: "Camera Switched",
        description: `Switched to ${newFacingMode === 'user' ? 'front' : 'back'} camera`
      });
    } catch (error) {
      console.error('Failed to switch camera:', error);
      toast({
        title: "Switch Failed",
        description: "Unable to switch camera",
        variant: "destructive"
      });
    }
  }, [currentFacingMode, isScreenSharing, toast, currentAudioDevice, currentVideoDevice]);

  const toggleScreenShare = useCallback(async () => {
    try {
      if (isScreenSharing) {
        await requestMediaPermissions(currentFacingMode, currentAudioDevice, currentVideoDevice);
        setIsScreenSharing(false);
        toast({
          title: "Screen Share Stopped",
          description: "Switched back to camera"
        });
      } else {
        if (!navigator.mediaDevices.getDisplayMedia) {
          toast({
            title: "Not Supported",
            description: "Screen sharing is not supported on this device",
            variant: "destructive"
          });
          return;
        }

        if (isMobile()) {
          toast({
            title: "Limited Support",
            description: "Screen sharing on mobile devices may not work as expected",
            variant: "default"
          });
        }

        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { 
            width: { ideal: 1920 }, 
            height: { ideal: 1080 },
            frameRate: { ideal: 15, max: 30 }
          },
          audio: false
        });
        
        const screenTrack = screenStream.getVideoTracks()[0];
        
        screenTrack.onended = () => {
          setIsScreenSharing(false);
          requestMediaPermissions(currentFacingMode, currentAudioDevice, currentVideoDevice);
        };
        
        peerConnections.current.forEach(pc => {
          const sender = pc.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          if (sender) {
            sender.replaceTrack(screenTrack).catch(console.warn);
          }
        });
        
        if (localStreamRef.current) {
          const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
          if (oldVideoTrack) {
            oldVideoTrack.stop();
            localStreamRef.current.removeTrack(oldVideoTrack);
          }
          localStreamRef.current.addTrack(screenTrack);
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        }
        
        setIsScreenSharing(true);
        toast({
          title: "Screen Share Started",
          description: "Your screen is now being shared"
        });
      }
    } catch (error) {
      console.error('Screen share error:', error);
      toast({
        title: "Screen Share Error",
        description: "Unable to share screen. This feature may not be supported on your device.",
        variant: "destructive"
      });
    }
  }, [isScreenSharing, currentFacingMode, toast, currentAudioDevice, currentVideoDevice]);

  const cleanup = useCallback(() => {
    console.log('Cleaning up WebRTC...');
    
    streamUpdateInProgress.current = false;
    
    reconnectTimeouts.current.forEach(timeout => clearTimeout(timeout));
    reconnectTimeouts.current.clear();
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
    }

    peerConnections.current.forEach(pc => {
      pc.close();
    });
    peerConnections.current.clear();

    cleanupSignaling();

    setLocalStream(null);
    setRemoteStreams([]);
    setIsVideoEnabled(true);
    setIsAudioEnabled(true);
    setIsScreenSharing(false);
    setConnectionRetries(new Map());
    localStreamRef.current = null;
    
    console.log('WebRTC cleanup completed');
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
    toggleVideo,
    toggleAudio,
    switchCamera,
    toggleScreenShare,
    handleDeviceChange,
    initialize,
    cleanup,
    connectedPeers: Array.from(connectedPeers)
  };
};
