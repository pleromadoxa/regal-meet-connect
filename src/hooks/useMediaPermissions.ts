import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface MediaPermissions {
  camera: 'granted' | 'denied' | 'prompt' | 'checking';
  microphone: 'granted' | 'denied' | 'prompt' | 'checking';
}

export interface MediaDevices {
  audioInputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
}

export const useMediaPermissions = () => {
  const [permissions, setPermissions] = useState<MediaPermissions>({
    camera: 'checking',
    microphone: 'checking'
  });
  const [devices, setDevices] = useState<MediaDevices>({
    audioInputs: [],
    videoInputs: [],
    audioOutputs: []
  });
  const [isSupported, setIsSupported] = useState(true);
  const { toast } = useToast();

  // Check if WebRTC is supported
  const checkWebRTCSupport = useCallback(() => {
    const hasWebRTC = !!(
      window.RTCPeerConnection ||
      (window as any).webkitRTCPeerConnection ||
      (window as any).mozRTCPeerConnection
    );
    
    const hasGetUserMedia = !!(
      navigator.mediaDevices?.getUserMedia ||
      (navigator as any).getUserMedia ||
      (navigator as any).webkitGetUserMedia ||
      (navigator as any).mozGetUserMedia
    );

    const supported = hasWebRTC && hasGetUserMedia;
    setIsSupported(supported);
    
    if (!supported) {
      toast({
        title: "Browser Not Supported",
        description: "Your browser doesn't support video conferencing. Please use Chrome, Firefox, Safari, or Edge.",
        variant: "destructive",
        duration: 8000
      });
    }
    
    return supported;
  }, [toast]);

  // Check permissions status
  const checkPermissions = useCallback(async () => {
    if (!navigator.permissions) {
      console.log('Permissions API not supported');
      setPermissions({
        camera: 'prompt',
        microphone: 'prompt'
      });
      return;
    }

    try {
      const [cameraPermission, microphonePermission] = await Promise.all([
        navigator.permissions.query({ name: 'camera' as PermissionName }),
        navigator.permissions.query({ name: 'microphone' as PermissionName })
      ]);

      setPermissions({
        camera: cameraPermission.state as MediaPermissions['camera'],
        microphone: microphonePermission.state as MediaPermissions['microphone']
      });

      console.log('Permissions status:', {
        camera: cameraPermission.state,
        microphone: microphonePermission.state
      });

      // Listen for permission changes
      cameraPermission.addEventListener('change', () => {
        setPermissions(prev => ({
          ...prev,
          camera: cameraPermission.state as MediaPermissions['camera']
        }));
      });

      microphonePermission.addEventListener('change', () => {
        setPermissions(prev => ({
          ...prev,
          microphone: microphonePermission.state as MediaPermissions['microphone']
        }));
      });

    } catch (error) {
      console.error('Error checking permissions:', error);
      setPermissions({
        camera: 'prompt',
        microphone: 'prompt'
      });
    }
  }, []);

  // Enumerate media devices
  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      const audioOutputs = devices.filter(device => device.kind === 'audiooutput');

      setDevices({
        audioInputs,
        videoInputs,
        audioOutputs
      });

      console.log('Media devices:', {
        audioInputs: audioInputs.length,
        videoInputs: videoInputs.length,
        audioOutputs: audioOutputs.length
      });

    } catch (error) {
      console.error('Error enumerating devices:', error);
      toast({
        title: "Device Detection Failed",
        description: "Could not detect your media devices. Please check your browser settings.",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Request media permissions
  const requestPermissions = useCallback(async (
    video: boolean = true, 
    audio: boolean = true
  ): Promise<MediaStream | null> => {
    try {
      setPermissions(prev => ({
        camera: video ? 'checking' : prev.camera,
        microphone: audio ? 'checking' : prev.microphone
      }));

      const constraints: MediaStreamConstraints = {
        video: video ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false,
        audio: audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Update permissions to granted
      setPermissions(prev => ({
        camera: video ? 'granted' : prev.camera,
        microphone: audio ? 'granted' : prev.microphone
      }));

      // Re-enumerate devices with labels now available
      await enumerateDevices();

      console.log('Media permissions granted:', {
        video: video && stream.getVideoTracks().length > 0,
        audio: audio && stream.getAudioTracks().length > 0
      });

      return stream;

    } catch (error: any) {
      console.error('Error requesting media permissions:', error);
      
      // Handle specific error types
      let errorMessage = "Failed to access camera and microphone.";
      let title = "Media Access Denied";
      
      if (error.name === 'NotAllowedError') {
        errorMessage = "Camera and microphone access was denied. Please allow access in your browser settings and refresh the page.";
      } else if (error.name === 'NotFoundError') {
        errorMessage = "No camera or microphone found. Please connect a media device and try again.";
        title = "No Media Devices";
      } else if (error.name === 'NotReadableError') {
        errorMessage = "Camera or microphone is already in use by another application.";
        title = "Device In Use";
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = "Camera or microphone doesn't meet the required specifications.";
        title = "Device Constraints";
      }

      // Update permissions to denied
      setPermissions(prev => ({
        camera: video ? 'denied' : prev.camera,
        microphone: audio ? 'denied' : prev.microphone
      }));

      toast({
        title,
        description: errorMessage,
        variant: "destructive",
        duration: 8000
      });

      return null;
    }
  }, [toast, enumerateDevices]);

  // Test media access without consuming the stream
  const testMediaAccess = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      // Immediately stop the stream
      stream.getTracks().forEach(track => track.stop());
      
      return true;
    } catch (error) {
      console.log('Media access test failed:', error);
      return false;
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    const initialize = async () => {
      if (!checkWebRTCSupport()) return;
      
      await checkPermissions();
      await enumerateDevices();
    };

    initialize();

    // Listen for device changes
    const handleDeviceChange = () => {
      console.log('Media devices changed');
      enumerateDevices();
    };

    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [checkWebRTCSupport, checkPermissions, enumerateDevices]);

  return {
    permissions,
    devices,
    isSupported,
    requestPermissions,
    testMediaAccess,
    enumerateDevices,
    checkPermissions
  };
};