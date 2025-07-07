import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { DeviceSelector } from '@/components/DeviceSelector';
import { InMeetingChat } from '@/components/InMeetingChat';
import { RaiseHand } from '@/components/RaiseHand';
import { VideoReactions } from '@/components/VideoReactions';
import { VideoControlsDock } from '@/components/VideoControlsDock';

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
  onNavigateToDashboard?: () => void;
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
  onNavigateToDashboard
}: VideoControlsProps) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [handRaised, setHandRaised] = useState(false);

  const handleHandRaise = () => {
    const newHandRaised = !handRaised;
    setHandRaised(newHandRaised);
    // Here you could broadcast the hand raise status to other participants
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
        onToggleChat={() => setShowChat(!showChat)}
        onToggleHand={handleHandRaise}
        onNavigateToDashboard={onNavigateToDashboard}
        onLeaveMeeting={onLeaveMeeting}
      />

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed bottom-32 left-1/2 transform -translate-x-1/2 z-40 w-80 max-w-[90vw]">
          <Card className="bg-black/90 backdrop-blur-xl border-white/20 p-4">
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

      {/* In-Meeting Chat */}
      {showChat && (
        <InMeetingChat
          userName={userName}
          onClose={() => setShowChat(false)}
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
