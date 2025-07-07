
import { useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface RemoteStream {
  id: string;
  stream: MediaStream;
  userName: string;
}

export const useWebRTC = (meetingId: string, userName: string) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const { toast } = useToast();

  const requestMediaPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      localStreamRef.current = stream;
      setLocalStream(stream);
      
      console.log('Media permissions granted:', {
        video: stream.getVideoTracks().length > 0,
        audio: stream.getAudioTracks().length > 0
      });
      
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast({
        title: "Permission Error",
        description: "Unable to access camera/microphone. Please check permissions.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const createPeerConnection = (remotePeerId: string) => {
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    };

    const peerConnection = new RTCPeerConnection(configuration);

    // Add local stream tracks to peer connection
    if (localStreamRef.current) {
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
        console.log('ICE candidate generated for:', remotePeerId);
        // In a real implementation, you would send this to the remote peer via signaling server
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
      }
    };

    peerConnections.current.set(remotePeerId, peerConnection);
    return peerConnection;
  };

  const initialize = async () => {
    try {
      await requestMediaPermissions();
      
      // Simulate connecting to other participants
      // In a real app, this would involve signaling server communication
      setTimeout(() => {
        console.log('WebRTC initialized for meeting:', meetingId);
        toast({
          title: "Connected",
          description: "Successfully joined the meeting!"
        });
      }, 1000);
      
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

  const toggleScreenShare = useCallback(async () => {
    try {
      if (isScreenSharing) {
        // Stop screen sharing and return to camera
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } }
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
          audio: true
        });
        
        const screenTrack = screenStream.getVideoTracks()[0];
        
        // Handle screen share end
        screenTrack.onended = () => {
          setIsScreenSharing(false);
          toggleScreenShare(); // This will switch back to camera
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

    // Reset state
    setLocalStream(null);
    setRemoteStreams([]);
    setIsVideoEnabled(true);
    setIsAudioEnabled(true);
    setIsScreenSharing(false);
    localStreamRef.current = null;
    
    console.log('WebRTC cleanup completed');
  }, []);

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
    cleanup
  };
};
