
import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { DeviceSelector } from '@/components/DeviceSelector';
import { InMeetingChat } from '@/components/InMeetingChat';
import { VideoReactions } from '@/components/VideoReactions';
import { VideoControlsDock } from '@/components/VideoControlsDock';
import { VideoEffectsPanel } from '@/components/VideoEffectsPanel';

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
  userId?: string;
  meetingId?: string;
  handRaised?: boolean;
  onToggleHand?: () => void;
  onToggleParticipants?: () => void;
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
  userId,
  meetingId,
  handRaised = false,
  onToggleHand,
  onToggleParticipants,
  onNavigateToDashboard,
}: VideoControlsProps) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  const getLocalVideoRef = () => {
    const videoElements = document.querySelectorAll('video');
    for (const video of videoElements) {
      if (video.muted) {
        localVideoRef.current = video;
        return video;
      }
    }
    return null;
  };

  return (
    <>
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
        onToggleHand={onToggleHand ?? (() => undefined)}
        onToggleEffects={() => setShowEffects(true)}
        onToggleParticipants={onToggleParticipants}
        onNavigateToDashboard={onNavigateToDashboard}
        onLeaveMeeting={onLeaveMeeting}
      />

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

      {showEffects && (
        <VideoEffectsPanel
          onClose={() => setShowEffects(false)}
          localVideoRef={getLocalVideoRef()}
        />
      )}

      {showChat && (
        <InMeetingChat
          meetingId={meetingId}
          userName={userName}
          onClose={() => setShowChat(false)}
        />
      )}

      <div className="fixed top-1/2 right-4 transform -translate-y-1/2 z-[60]">
        <VideoReactions meetingId={meetingId} userId={userId} userName={userName} />
      </div>
    </>
  );
};
