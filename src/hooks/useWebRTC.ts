
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
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const { toast } = useToast();

  const { initializeSignaling, sendSignalingMessage, connectedPeers, cleanup: cleanupSignaling } = 
    useWebRTCSignaling(meetingId, userId);

  const getMediaConstraints = () => ({
    video: {
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
      frameRate: { ideal: 30, max: 60 },
      facingMode: 'user'
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 44100
    }
  });

  const requestMediaPermissions = async () => {
    try {
      // Check if we're on mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      const constraints = {
        video: {
          ...getMediaConstraints().video,
          // On mobile, prefer environment camera for better quality
          facingMode: isMobile ? { ideal: 'environment' } : 'user'
        },
        audio: getMediaConstraints().audio
      };

      console.log('Requesting media permissions with constraints:', constraints);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      localStreamRef.current = stream;
      setLocalStream(stream);
      
      console.log('Media permissions granted:', {
        video: stream.getVideoTracks().length > 0,
        audio: stream.getAudioTracks().length > 0,
        videoSettings: stream.getVideoTracks()[0]?.getSettings(),
        audioSettings: stream.getAudioTracks()[0]?.getSettings()
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
        // Fallback to basic constraints if advanced ones fail
        try {
          console.log('Falling back to basic constraints');
          const basicStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          });
          
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
    const peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local stream tracks
    if (localStreamRef.current) {
      console.log('Adding local tracks to peer connection for:', remotePeerId);
      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle incoming remote streams
    peerConnection.ontrack = (event) => {
      console.log('Received remote stream from:', remotePeerId);
      const [remoteStream] = event.streams;
      
      setRemoteStreams(prev => {
        const existing = prev.find(s => s.id === remotePeerId);
        if (existing) {
          return prev.map(s => 
            s.id === remotePeerId 
              ? { ...s, stream: remoteStream }
              : s
          );
        }
        return [...prev, { 
          id: remotePeerId, 
          stream: remoteStream, 
          userName: `User ${remotePeerId.slice(-4)}` 
        }];
      });
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
        toast({
          title: "Connection Issue",
          description: `Connection with participant ${remotePeerId.slice(-4)} failed`,
          variant: "destructive"
        });
      } else if (peerConnection.connectionState === 'connected') {
        toast({
          title: "Peer Connected",
          description: `Connected to participant ${remotePeerId.slice(-4)}`
        });
      }
    };

    // Handle ICE connection state
    peerConnection.oniceconnectionstatechange = () => {
      console.log(`ICE connection state with ${remotePeerId}:`, peerConnection.iceConnectionState);
    };

    peerConnections.current.set(remotePeerId, peerConnection);
    return peerConnection;
  }, [sendSignalingMessage, toast]);

  const handleSignalingMessage = useCallback(async (message: any) => {
    const { type, data, from } = message;
    console.log('Handling signaling message:', type, 'from:', from);

    try {
      switch (type) {
        case 'offer':
          const pc1 = createPeerConnection(from);
          await pc1.setRemoteDescription(new RTCSessionDescription(data));
          const answer = await pc1.createAnswer();
          await pc1.setLocalDescription(answer);
          sendSignalingMessage({
            type: 'answer',
            data: answer,
            to: from
          });
          break;

        case 'answer':
          const pc2 = peerConnections.current.get(from);
          if (pc2) {
            await pc2.setRemoteDescription(new RTCSessionDescription(data));
          }
          break;

        case 'ice-candidate':
          const pc3 = peerConnections.current.get(from);
          if (pc3) {
            await pc3.addIceCandidate(new RTCIceCandidate(data));
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

  // Handle new peers joining
  useEffect(() => {
    connectedPeers.forEach(peerId => {
      if (!peerConnections.current.has(peerId)) {
        console.log('New peer detected, initiating call:', peerId);
        initiateCallToPeer(peerId);
      }
    });
  }, [connectedPeers, initiateCallToPeer]);

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

  const toggleScreenShare = useCallback(async () => {
    try {
      if (isScreenSharing) {
        // Stop screen sharing and return to camera
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: getMediaConstraints().video
        });
        
        const videoTrack = videoStream.getVideoTracks()[0];
        
        // Replace video track in all peer connections
        peerConnections.current.forEach(pc => {
          const sender = pc.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });
        
        // Update local stream
        if (localStreamRef.current) {
          const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
          if (oldVideoTrack) {
            oldVideoTrack.stop();
            localStreamRef.current.removeTrack(oldVideoTrack);
          }
          localStreamRef.current.addTrack(videoTrack);
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        }
        
        setIsScreenSharing(false);
        toast({
          title: "Screen Share Stopped",
          description: "Switched back to camera"
        });
      } else {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false // Audio from screen share can cause feedback
        });
        
        const screenTrack = screenStream.getVideoTracks()[0];
        
        // Handle screen share end
        screenTrack.onended = () => {
          setIsScreenSharing(false);
          toggleScreenShare();
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
  }, [isScreenSharing, toast]);

  const cleanup = useCallback(() => {
    console.log('Cleaning up WebRTC...');
    
    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
    }

    // Close all peer connections
    peerConnections.current.forEach(pc => {
      pc.close();
    });
    peerConnections.current.clear();

    // Cleanup signaling
    cleanupSignaling();

    // Reset state
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
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    initialize,
    cleanup,
    connectedPeers: Array.from(connectedPeers)
  };
};
