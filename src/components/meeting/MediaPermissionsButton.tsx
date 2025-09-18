import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Video, Mic, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MediaPermissionsButtonProps {
  onPermissionsGranted?: () => void;
}

export const MediaPermissionsButton = ({ onPermissionsGranted }: MediaPermissionsButtonProps) => {
  const [isChecking, setIsChecking] = useState(false);
  const [hasPermissions, setHasPermissions] = useState<boolean | null>(null);
  const { toast } = useToast();

  const checkPermissions = async () => {
    setIsChecking(true);
    try {
      // Check current permissions
      const videoPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      const audioPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      
      console.log('📋 Current permissions:', {
        camera: videoPermission.state,
        microphone: audioPermission.state
      });

      if (videoPermission.state === 'granted' && audioPermission.state === 'granted') {
        setHasPermissions(true);
        toast({
          title: "Permissions Already Granted",
          description: "Camera and microphone access is enabled",
        });
        onPermissionsGranted?.();
        return;
      }

      // If not granted, try to request
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

      console.log('✅ Successfully got media stream for testing:', {
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length
      });

      // Stop test stream
      stream.getTracks().forEach(track => track.stop());
      
      setHasPermissions(true);
      toast({
        title: "Permissions Granted!",
        description: "Camera and microphone are now accessible",
      });
      
      onPermissionsGranted?.();

    } catch (error) {
      console.error('❌ Permission check failed:', error);
      setHasPermissions(false);
      
      let errorMessage = "Failed to access camera and microphone";
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = "Please click 'Allow' when prompted for camera and microphone access";
        } else if (error.name === 'NotFoundError') {
          errorMessage = "No camera or microphone found. Please connect devices and try again";
        } else if (error.name === 'NotReadableError') {
          errorMessage = "Camera or microphone is being used by another application";
        }
      }
      
      toast({
        title: "Permission Error",
        description: errorMessage,
        variant: "destructive",
        duration: 10000
      });
    } finally {
      setIsChecking(false);
    }
  };

  const getButtonContent = () => {
    if (isChecking) {
      return (
        <>
          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
          Checking...
        </>
      );
    }

    if (hasPermissions === true) {
      return (
        <>
          <CheckCircle className="h-4 w-4 mr-2" />
          Media Access Ready
        </>
      );
    }

    if (hasPermissions === false) {
      return (
        <>
          <AlertCircle className="h-4 w-4 mr-2" />
          Retry Access
        </>
      );
    }

    return (
      <>
        <Video className="h-4 w-4 mr-1" />
        <Mic className="h-4 w-4 mr-2" />
        Enable Camera & Mic
      </>
    );
  };

  const getButtonVariant = () => {
    if (hasPermissions === true) return "default";
    if (hasPermissions === false) return "destructive";
    return "secondary";
  };

  return (
    <Button
      onClick={checkPermissions}
      disabled={isChecking}
      variant={getButtonVariant()}
      className="transition-all duration-200"
    >
      {getButtonContent()}
    </Button>
  );
};