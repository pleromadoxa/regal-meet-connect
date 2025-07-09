
import React from 'react';
import { ResponsiveParticipantGrid } from '@/components/ResponsiveParticipantGrid';
import { ParticipantsList } from '@/components/ParticipantsList';

interface RemoteStream {
  id: string;
  stream: MediaStream;
  userName: string;
}

interface MeetingLayoutProps {
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

export const MeetingLayout = ({
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
}: MeetingLayoutProps) => {
  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
      <div className="flex-1 min-w-0 relative">
        <ResponsiveParticipantGrid
          localStream={localStream}
          remoteStreams={remoteStreams}
          userName={userName}
          isVideoEnabled={isVideoEnabled}
          selectedVideoId={selectedVideoId}
          onVideoSelect={onVideoSelect}
          showParticipants={showParticipants}
          participants={participants}
          currentUserId={currentUserId}
          isHost={isCurrentUserHost}
          onToggleMute={onToggleMute}
        />
      </div>

      <div className={`w-full lg:w-80 ${showParticipants ? 'block' : 'hidden lg:block'}`}>
        <ParticipantsList
          participants={participants}
          remoteStreams={remoteStreams}
          localStream={localStream}
          currentUserId={currentUserId}
          isHost={isCurrentUserHost}
          onToggleMute={onToggleMute}
          onSelectVideo={onVideoSelect}
          selectedVideoId={selectedVideoId}
        />
      </div>
    </div>
  );
};
