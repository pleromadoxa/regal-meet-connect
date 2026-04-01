
import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { DeviceSelector } from '@/components/DeviceSelector';
import { RaiseHand } from '@/components/RaiseHand';
import { VideoReactions } from '@/components/VideoReactions';
import { VideoControlsDock } from '@/components/VideoControlsDock';
import { VideoEffectsPanel } from '@/components/VideoEffectsPanel';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VideoControlsProps {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  currentFacingMode: 'user' | 'environment';
  currentAudioDevice: string;
  currentVideoDevice: string;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onToggleScreenShare: () => void;
  onSwitchCamera: () => void;
  onLeaveMeeting: () => void;
  onDeviceChange: (type: 'audio' | 'video', deviceId: string) => void;
  onToggleCaptions: () => void;
  captionsEnabled: boolean;
  userName: string;
  meetingId?: string;
  onNavigateToDashboard?: () => void;
  showChat: boolean;
  onToggleChat: () => void;
  onToggleParticipants?: () => void;
  onTogglePiP?: () => void;
}

export const VideoControls = ({
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
  currentFacingMode,
  currentAudioDevice,
  currentVideoDevice,
  onToggleVideo,
  onToggleAudio,
  onToggleScreenShare,
  onSwitchCamera,
  onLeaveMeeting,
  onDeviceChange,
  onToggleCaptions,
  captionsEnabled,
  userName,
  meetingId,
  onNavigateToDashboard,
  showChat,
  onToggleChat,
  onToggleParticipants,
  onTogglePiP
}: VideoControlsProps) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const { toast } = useToast();

  const handleHandRaise = () => {
    const newHandRaised = !handRaised;
    setHandRaised(newHandRaised);
    
    // Broadcast hand raise status to other participants
    if (meetingId) {
      const channel = supabase.channel(`meeting-hands-${meetingId}`);
      
      channel.send({
        type: 'broadcast',
        event: 'hand-raised',
        payload: {
          userName: userName,
          handRaised: newHandRaised,
          timestamp: Date.now()
        }
      });

      // Show toast notification
      toast({
        title: newHandRaised ? "Hand Raised" : "Hand Lowered",
        description: newHandRaised 
          ? "Your hand has been raised. Other participants will be notified." 
          : "Your hand has been lowered.",
        duration: 3000
      });
    }
  };

  // Get reference to local video element for effects
  const getLocalVideoRef = () => {
    const videoElements = document.querySelectorAll('video');
    for (const video of videoElements) {
      if (video.muted) { // Local video is muted
        localVideoRef.current = video;
        return video;
      }
    }
    return null;
  };

  return (
    <>
      {/* Main Controls Dock */}
      <VideoControlsDock
        isVideoEnabled={isVideoEnabled}
        isAudioEnabled={isAudioEnabled}
        isScreenSharing={isScreenSharing}
        captionsEnabled={captionsEnabled}
        showSettings={showSettings}
        showChat={showChat}
        handRaised={handRaised}
        onToggleVideo={onToggleVideo}
        onToggleAudio={onToggleAudio}
        onToggleScreenShare={onToggleScreenShare}
        onSwitchCamera={onSwitchCamera}
        onToggleCaptions={onToggleCaptions}
        onToggleSettings={() => setShowSettings(!showSettings)}
        onToggleChat={onToggleChat}
        onToggleParticipants={onToggleParticipants}
        onToggleHand={handleHandRaise}
        onToggleEffects={() => setShowEffects(true)}
        onNavigateToDashboard={onNavigateToDashboard}
        onLeaveMeeting={onLeaveMeeting}
        onTogglePiP={onTogglePiP}
      />

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed bottom-32 left-1/2 transform -translate-x-1/2 z-40 w-80 max-w-[90vw]">
          <Card className="bg-black/90 backdrop-blur-xl border-white/20 p-4 animate-fade-in">
            <div className="space-y-4">
              <h3 className="text-white font-semibold mb-4">Device Settings</h3>
              
              <DeviceSelector
                type="audio"
                currentDeviceId={currentAudioDevice}
                onDeviceChange={(deviceId) => onDeviceChange('audio', deviceId)}
              />
              
              <DeviceSelector
                type="video"
                currentDeviceId={currentVideoDevice}
                onDeviceChange={(deviceId) => onDeviceChange('video', deviceId)}
              />
            </div>
          </Card>
        </div>
      )}

      {/* Video Effects Panel */}
      {showEffects && (
        <VideoEffectsPanel
          onClose={() => setShowEffects(false)}
          localVideoRef={getLocalVideoRef()}
        />
      )}


      {/* Video Reactions Overlay - positioned with higher z-index */}
      <div className="fixed top-1/2 right-4 transform -translate-y-1/2 z-[60]">
        <VideoReactions />
      </div>

      {/* Raise Hand Component - integrated into dock but keeping for broadcast functionality */}
      <div className="hidden">
        <RaiseHand onHandRaise={setHandRaised} isRaised={handRaised} />
      </div>
    </>
  );
};
