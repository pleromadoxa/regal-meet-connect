import React from 'react';
import { Camera, Mic, AlertCircle, Shield, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MediaPermissions } from '@/hooks/useMediaPermissions';

interface MediaPermissionsModalProps {
  isOpen: boolean;
  permissions: MediaPermissions;
  onRequestPermissions: (video: boolean, audio: boolean) => void;
  onClose: () => void;
  onRetry: () => void;
}

export const MediaPermissionsModal = ({
  isOpen,
  permissions,
  onRequestPermissions,
  onClose,
  onRetry
}: MediaPermissionsModalProps) => {
  const hasAnyDenied = permissions.camera === 'denied' || permissions.microphone === 'denied';
  const allGranted = permissions.camera === 'granted' && permissions.microphone === 'granted';

  const getPermissionStatus = (permission: 'granted' | 'denied' | 'prompt' | 'checking') => {
    switch (permission) {
      case 'granted':
        return { color: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'Granted' };
      case 'denied':
        return { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Denied' };
      case 'prompt':
        return { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'Requested' };
      case 'checking':
        return { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Checking...' };
    }
  };

  const cameraStatus = getPermissionStatus(permissions.camera);
  const micStatus = getPermissionStatus(permissions.microphone);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-white">
            <Shield className="w-5 h-5 text-blue-400" />
            <span>Media Permissions</span>
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {hasAnyDenied 
              ? "Some permissions were denied. Please allow access to join the meeting."
              : allGranted
                ? "All permissions granted! You can now join the meeting."
                : "We need access to your camera and microphone to join the meeting."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera Permission */}
          <div className="flex items-center space-x-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Camera className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-white font-medium">Camera Access</h4>
              <p className="text-sm text-slate-400">Share your video with other participants</p>
            </div>
            <Badge variant="outline" className={cameraStatus.color}>
              {cameraStatus.label}
            </Badge>
          </div>

          {/* Microphone Permission */}
          <div className="flex items-center space-x-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Mic className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-white font-medium">Microphone Access</h4>
              <p className="text-sm text-slate-400">Share your audio with other participants</p>
            </div>
            <Badge variant="outline" className={micStatus.color}>
              {micStatus.label}
            </Badge>
          </div>

          {/* Error Message for Denied Permissions */}
          {hasAnyDenied && (
            <div className="flex items-start space-x-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-red-400 font-medium mb-1">Permissions Denied</p>
                <p className="text-red-300/80">
                  To join the meeting, please click the camera/microphone icon in your browser's address bar 
                  and select "Allow", then refresh this page.
                </p>
                <p className="text-red-300/60 mt-2 text-xs">
                  You can also check your browser settings under Privacy & Security → Site Settings → Camera/Microphone.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col space-y-2">
            {!allGranted && !hasAnyDenied && (
              <>
                <Button
                  onClick={() => onRequestPermissions(true, true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={permissions.camera === 'checking' || permissions.microphone === 'checking'}
                >
                  {permissions.camera === 'checking' || permissions.microphone === 'checking' ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Checking Permissions...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Allow Camera & Microphone
                    </>
                  )}
                </Button>
                
                <div className="flex space-x-2">
                  <Button
                    onClick={() => onRequestPermissions(false, true)}
                    variant="outline"
                    className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    Audio Only
                  </Button>
                  <Button
                    onClick={() => onRequestPermissions(true, false)}
                    variant="outline"
                    className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Video Only
                  </Button>
                </div>
              </>
            )}

            {hasAnyDenied && (
              <Button
                onClick={onRetry}
                variant="outline"
                className="w-full border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Permissions
              </Button>
            )}

            {allGranted && (
              <Button
                onClick={onClose}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                Continue to Meeting
              </Button>
            )}
          </div>

          {/* Help Text */}
          <div className="text-xs text-slate-500 text-center space-y-1">
            <p>Your media will only be shared with other meeting participants.</p>
            <p>You can change these permissions anytime during the meeting.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};