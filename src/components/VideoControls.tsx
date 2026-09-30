import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { DeviceSelector } from '@/components/DeviceSelector';
import { InMeetingChat } from '@/components/InMeetingChat';
import { VideoReactions } from '@/components/VideoReactions';
import { VideoControlsDock } from '@/components/VideoControlsDock';
import { VideoEffectsPanel } from '@/components/VideoEffectsPanel';
import { useIsMobile } from '@/hooks/use-mobile';

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
  onToggleBrief?: () => void;
  showBrief?: boolean;
}

export const VideoControls = ({
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
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
  onToggleBrief,
  showBrief = false,
}: VideoControlsProps) => {
  const isMobile = useIsMobile();
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
        onToggleBrief={onToggleBrief}
        showBrief={showBrief}
      />

      {!isMobile && (
        <div className="fixed right-3 top-[42%] z-[55] -translate-y-1/2 sm:right-4 sm:top-1/2">
          <VideoReactions />
        </div>
      )}

      {showSettings && (
        <div className="fixed bottom-[calc(var(--meeting-dock-height)+0.5rem)] left-1/2 z-40 w-[min(20rem,calc(100vw-1.5rem))] -translate-x-1/2">
          <Card className="animate-fade-in border-white/20 bg-black/90 p-4 backdrop-blur-xl">
            <div className="space-y-4">
              <h3 className="mb-4 font-semibold text-white">Device Settings</h3>

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
    </>
  );
};
