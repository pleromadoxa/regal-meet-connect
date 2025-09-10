
import React from 'react';
import { ResponsiveVideoGrid } from './ResponsiveVideoGrid';

interface RemoteStream {
  id: string;
  stream: MediaStream;
  userName: string;
}

interface MobileParticipantGridProps {
  localStream: MediaStream | null;
  remoteStreams: RemoteStream[];
  userName: string;
  selectedVideoId: string;
  onVideoSelect: (streamId: string) => void;
  isCurrentUserHost: boolean;
  participants: any[];
  currentUserId: string;
  isVideoEnabled: boolean;
}

export const MobileParticipantGrid = ({
  localStream,
  remoteStreams,
  userName,
  selectedVideoId,
  onVideoSelect,
  isCurrentUserHost,
  participants,
  currentUserId,
  isVideoEnabled
}: MobileParticipantGridProps) => {
  return (
    <div className="h-full w-full">
      <ResponsiveVideoGrid
        localStream={localStream}
        remoteStreams={remoteStreams}
        userName={userName}
        isVideoEnabled={isVideoEnabled}
        participants={participants}
        currentUserId={currentUserId}
        isCurrentUserHost={isCurrentUserHost}
      />
    </div>
  );
};
