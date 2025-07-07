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
  { urls: 'stun:stun2.l.google.com:19302' }
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
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const { toast } = useToast();

  const { initializeSignaling, sendSignalingMessage, connectedPeers, peerUserNames, cleanup: cleanupSignaling } = 
    useWebRTCSignaling(meetingId, userId, userName);

  const getMediaConstraints = (facingMode: 'user' | 'environment' = 'user', audioDeviceId?: string, videoDeviceId?: string) => ({
    video: videoDeviceId ? 
      { deviceId: { exact: videoDeviceId } } : 
      {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 60 },
        facingMode: facingMode
      },
    audio: audioDeviceId ? 
      { deviceId: { exact: audioDeviceId } } : 
      {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100
      }
  });

  const requestMediaPermissions = async (facingMode: 'user' | 'environment' = 'user', audioDeviceId?: string, videoDeviceId?: string) => {
    try {
      const constraints = getMediaConstraints(facingMode, audioDeviceId, videoDeviceId);
      console.log('Requesting media permissions with constraints:', constraints);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      localStreamRef.current = stream;
      setLocalStream(stream);
      setCurrentFacingMode(facingMode);
      
      // Set current device IDs
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        setCurrentVideoDevice(settings.deviceId || '');
      }
      if (audioTrack) {
        const settings = audioTrack.getSettings();
        setCurrentAudioDevice(settings.deviceId || '');
      }
      
      console.log('Media permissions granted:', {
        video: stream.getVideoTracks().length > 0,
        audio: stream.getAudioTracks().length > 0,
        videoSettings: videoTrack?.getSettings(),
        audioSettings: audioTrack?.getSettings()
      });
      
      // Update all peer connections with new stream
      peerConnections.current.forEach(async (pc, peerId) => {
        console.log('Updating peer connection with new stream for:', peerId);
        
        // Remove old tracks
        pc.getSenders().forEach(sender => {
          if (sender.track) {
            pc.removeTrack(sender);
          }
        });
        
        // Add new tracks
        stream.getTracks().forEach(track => {
          console.log('Adding track to peer connection:', track.kind, peerId);
          pc.addTrack(track, stream);
        });
        
        // Create new offer to renegotiate
        if (pc.signalingState === 'stable') {
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            sendSignalingMessage({
              type: 'offer',
              data: offer,
              to: peerId
            });
          } catch (error) {
            console.error('Error creating renegotiation offer:', error);
          }
        }
      });
      
      return stream;
    } catch (error: any) {
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
            video: true,
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
    const peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local stream tracks
    if (localStreamRef.current) {
      console.log('Adding local tracks to peer connection for:', remotePeerId);
      localStreamRef.current.getTracks().forEach(track => {
        console.log('Adding track:', track.kind, track.enabled);
        peerConnection.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle incoming remote streams
    peerConnection.ontrack = (event) => {
      console.log('Received remote stream from:', remotePeerId, event);
      const [remoteStream] = event.streams;
      
      if (remoteStream && remoteStream.getTracks().length > 0) {
        console.log('Remote stream tracks:', remoteStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));
        
        setRemoteStreams(prev => {
          const existing = prev.find(s => s.id === remotePeerId);
          const peerName = peerUserNames.get(remotePeerId) || `User ${remotePeerId.slice(-4)}`;
          
          if (existing) {
            console.log('Updating existing remote stream for:', remotePeerId);
            return prev.map(s => 
              s.id === remotePeerId 
                ? { ...s, stream: remoteStream, userName: peerName }
                : s
            );
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

    // Handle ICE candidates
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

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state with ${remotePeerId}:`, peerConnection.connectionState);
      
      if (peerConnection.connectionState === 'failed') {
        console.log('Connection failed, attempting to restart ICE');
        peerConnection.restartIce();
      } else if (peerConnection.connectionState === 'connected') {
        console.log('Peer connected successfully');
      } else if (peerConnection.connectionState === 'disconnected') {
        console.log('Peer disconnected');
        // Remove remote stream when disconnected
        setRemoteStreams(prev => prev.filter(s => s.id !== remotePeerId));
      }
    };

    peerConnections.current.set(remotePeerId, peerConnection);
    return peerConnection;
  }, [sendSignalingMessage, peerUserNames]);

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
          if (pc2) {
            await pc2.setRemoteDescription(new RTCSessionDescription(data));
            console.log('Set remote description for answer from:', from);
          }
          break;

        case 'ice-candidate':
          console.log('Received ICE candidate from:', from);
          const pc3 = peerConnections.current.get(from);
          if (pc3) {
            await pc3.addIceCandidate(new RTCIceCandidate(data));
            console.log('Added ICE candidate from:', from);
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

  // Handle new peers joining and update user names
  useEffect(() => {
    connectedPeers.forEach(peerId => {
      if (!peerConnections.current.has(peerId)) {
        console.log('New peer detected, initiating call:', peerId);
        initiateCallToPeer(peerId);
      }
    });

    // Update remote stream user names when peer names change
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
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false
        });
        
        const screenTrack = screenStream.getVideoTracks()[0];
        
        screenTrack.onended = () => {
          setIsScreenSharing(false);
          requestMediaPermissions(currentFacingMode, currentAudioDevice, currentVideoDevice);
        };
        
        // Replace video track in all peer connections
        peerConnections.current.forEach(pc => {
          const sender = pc.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        });
        
        // Update local stream
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
        description: "Unable to share screen. Please try again.",
        variant: "destructive"
      });
    }
  }, [isScreenSharing, currentFacingMode, toast, currentAudioDevice, currentVideoDevice]);

  const cleanup = useCallback(() => {
    console.log('Cleaning up WebRTC...');
    
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
