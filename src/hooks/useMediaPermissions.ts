import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { acquireUserMedia, getMediaAccessErrorInfo, isMediaDevicesSupported } from '@/lib/mediaAccess';

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

    const supported = hasWebRTC && isMediaDevicesSupported();
    setIsSupported(supported);

    if (!supported) {
      toast({
        title: window.isSecureContext ? 'Browser Not Supported' : 'Secure connection required',
        description: window.isSecureContext
          ? "Your browser doesn't support video conferencing. Please use Chrome, Firefox, Safari, or Edge."
          : 'Camera and microphone require HTTPS. Use https://meet.regalmesh.com',
        variant: 'destructive',
        duration: 8000,
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
        video: video
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
            }
          : false,
        audio: audio
          ? {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          : false,
      };

      if (!video && !audio) {
        return null;
      }

      const stream = await acquireUserMedia(constraints);
      
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

    } catch (error: unknown) {
      console.error('Error requesting media permissions:', error);

      const info = getMediaAccessErrorInfo(error);

      setPermissions((prev) => ({
        camera: video ? 'denied' : prev.camera,
        microphone: audio ? 'denied' : prev.microphone,
      }));

      toast({
        title: info.title,
        description: info.description,
        variant: 'destructive',
        duration: 8000,
      });

      return null;
    }
  }, [toast, enumerateDevices]);

  const testMediaAccess = useCallback(async (): Promise<boolean> => {
    if (!isMediaDevicesSupported()) return false;

    try {
      if (!navigator.permissions) return true;

      const [cameraPermission, microphonePermission] = await Promise.all([
        navigator.permissions.query({ name: 'camera' as PermissionName }),
        navigator.permissions.query({ name: 'microphone' as PermissionName }),
      ]);

      return cameraPermission.state !== 'denied' || microphonePermission.state !== 'denied';
    } catch {
      return true;
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