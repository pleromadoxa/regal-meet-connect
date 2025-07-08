
import React from 'react';
import { SpeakerView } from './SpeakerView';
import { ParticipantsSidebar } from './ParticipantsSidebar';
import { MobileParticipantGrid } from './MobileParticipantGrid';
import { useIsMobile } from '@/hooks/use-mobile';

interface RemoteStream {
  id: string;
  stream: MediaStream;
  userName: string;
}

interface NewMeetingLayoutProps {
  localStream: MediaStream | null;
  remoteStreams: RemoteStream[];
  userName: string;
  isVideoEnabled: boolean;
  selectedVideoId: string;
  onVideoSelect: (streamId: string) => void;
  isCurrentUserHost: boolean;
  participants: any[];
  showParticipants: boolean;
  currentUserId: string;
  onToggleMute: (participantId: string, isMuted: boolean) => void;
}

export const NewMeetingLayout = ({
  localStream,
  remoteStreams,
  userName,
  isVideoEnabled,
  selectedVideoId,
  onVideoSelect,
  isCurrentUserHost,
  participants,
  showParticipants,
  currentUserId,
  onToggleMute
}: NewMeetingLayoutProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="flex-1 relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <MobileParticipantGrid
          localStream={localStream}
          remoteStreams={remoteStreams}
          userName={userName}
          selectedVideoId={selectedVideoId}
          onVideoSelect={onVideoSelect}
          isCurrentUserHost={isCurrentUserHost}
          participants={participants}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 gap-4 overflow-hidden">
      {/* Main speaker view */}
      <SpeakerView
        localStream={localStream}
        remoteStreams={remoteStreams}
        userName={userName}
        selectedVideoId={selectedVideoId}
        isCurrentUserHost={isCurrentUserHost}
        participants={participants}
      />

      {/* Participants sidebar */}
      <ParticipantsSidebar
        localStream={localStream}
        remoteStreams={remoteStreams}
        userName={userName}
        selectedVideoId={selectedVideoId}
        onVideoSelect={onVideoSelect}
        isCurrentUserHost={isCurrentUserHost}
        participants={participants}
        currentUserId={currentUserId}
      />
    </div>
  );
};
