import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { DeviceSelector } from '@/components/DeviceSelector';
import { InMeetingChat } from '@/components/InMeetingChat';
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
  userId: string;
  meetingId?: string;
  isHost?: boolean;
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
  isHost,
  onNavigateToDashboard
}: VideoControlsProps) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const { toast } = useToast();

  const handleHandRaise = () => {
    const newHandRaised = !handRaised;
    setHandRaised(newHandRaised);
    
    if (meetingId) {
      supabase.channel(`meeting-hands-${meetingId}`).send({
        type: 'broadcast',
        event: 'hand-raised',
        payload: { userName, handRaised: newHandRaised }
      });

      toast({
        title: newHandRaised ? "Hand Raised" : "Hand Lowered",
        duration: 2000
      });
    }
  };

  const handleToggleRecording = async () => {
    if (!isHost) {
      toast({ title: "Host Only", description: "Only hosts can record meetings.", variant: "destructive" });
      return;
    }

    const newRecordingState = !isRecording;
    setIsRecording(newRecordingState);

    if (meetingId) {
      try {
        if (newRecordingState) {
          await supabase.from('meeting_recordings').insert({
            meeting_id: meetingId,
            status: 'recording',
            started_at: new Date().toISOString()
          });
          toast({ title: "Recording Started", description: "This meeting is being recorded." });
        } else {
          await supabase.from('meeting_recordings')
            .update({ status: 'completed', ended_at: new Date().toISOString() })
            .eq('meeting_id', meetingId)
            .eq('status', 'recording');
          toast({ title: "Recording Saved", description: "Recording has been saved to your library." });
        }
      } catch (error) {
        console.error('Recording error:', error);
      }
    }
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
        isRecording={isRecording}
        isHost={isHost}
        onToggleVideo={onToggleVideo}
        onToggleAudio={onToggleAudio}
        onToggleScreenShare={onToggleScreenShare}
        onSwitchCamera={onSwitchCamera}
        onToggleCaptions={onToggleCaptions}
        onToggleSettings={() => setShowSettings(!showSettings)}
        onToggleChat={() => setShowChat(!showChat)}
        onToggleHand={handleHandRaise}
        onToggleEffects={() => setShowEffects(true)}
        onToggleRecording={handleToggleRecording}
        onNavigateToDashboard={onNavigateToDashboard}
        onLeaveMeeting={onLeaveMeeting}
      />

      {showSettings && (
        <div className="fixed bottom-32 left-1/2 transform -translate-x-1/2 z-40 w-80 max-w-[90vw]">
          <Card className="bg-black/90 backdrop-blur-xl border-white/20 p-4 animate-fade-in">
            <div className="space-y-4">
              <h3 className="text-white font-semibold mb-2">Devices</h3>
              <DeviceSelector type="audio" currentDeviceId={currentAudioDevice} onDeviceChange={(id) => onDeviceChange('audio', id)} />
              <DeviceSelector type="video" currentDeviceId={currentVideoDevice} onDeviceChange={(id) => onDeviceChange('video', id)} />
            </div>
          </Card>
        </div>
      )}

      {showEffects && <VideoEffectsPanel onClose={() => setShowEffects(false)} />}

      {showChat && meetingId && (
        <InMeetingChat
          meetingId={meetingId}
          userId={userId}
          userName={userName}
          onClose={() => setShowChat(false)}
        />
      )}
    </>
  );
};
