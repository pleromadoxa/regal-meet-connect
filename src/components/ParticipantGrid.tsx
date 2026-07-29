
import React from 'react';
import { ResponsiveVideoGrid } from '@/components/meeting/ResponsiveVideoGrid';

interface RemoteStream {
  id: string;
  stream: MediaStream;
  userName: string;
}

interface ParticipantGridProps {
  localStream: MediaStream | null;
  remoteStreams: RemoteStream[];
  userName: string;
  isVideoEnabled: boolean;
  selectedVideoId?: string;
  onVideoSelect?: (streamId: string) => void;
  participants?: any[];
  currentUserId?: string;
  isCurrentUserHost?: boolean;
}

export const ParticipantGrid = ({ 
  localStream, 
  remoteStreams, 
  userName, 
  isVideoEnabled,
  selectedVideoId,
  onVideoSelect,
  participants = [],
  currentUserId = '',
  isCurrentUserHost = false
}: ParticipantGridProps) => {
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

