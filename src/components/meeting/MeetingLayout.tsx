
import React from 'react';
import { ResponsiveVideoGrid } from './ResponsiveVideoGrid';
import { AudioOnlyGrid } from './AudioOnlyGrid';
import { ParticipantsList } from './ParticipantsList';

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
  // Create meeting ID from URL for participants list
  const meetingId = window.location.pathname.split('/meeting/')[1]?.split('?')[0] || '';
  
  // Check if any participant has video enabled
  const hasAnyVideo = isVideoEnabled || remoteStreams.some(stream => 
    stream.stream?.getVideoTracks()?.some(track => track.enabled)
  );

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
      <div className="flex-1 min-w-0 relative">
        {hasAnyVideo ? (
          <ResponsiveVideoGrid
            localStream={localStream}
            remoteStreams={remoteStreams}
            userName={userName}
            isVideoEnabled={isVideoEnabled}
            participants={participants}
            currentUserId={currentUserId}
            isCurrentUserHost={isCurrentUserHost}
          />
        ) : (
          <AudioOnlyGrid
            localStream={localStream}
            remoteStreams={remoteStreams}
            userName={userName}
            participants={participants}
            currentUserId={currentUserId}
            isCurrentUserHost={isCurrentUserHost}
          />
        )}
      </div>

      {/* Participants Sidebar */}
      {showParticipants && (
        <div className="w-full lg:w-80 bg-slate-900/95 backdrop-blur-lg border border-slate-700/50 rounded-lg">
          <ParticipantsList
            participants={participants}
            remoteStreams={remoteStreams}
            localStream={localStream}
            isCurrentUserHost={isCurrentUserHost}
            currentUserId={currentUserId}
            userName={userName}
            meetingId={meetingId}
            onClose={() => {}}
            onToggleMute={onToggleMute}
            onSelectVideo={onVideoSelect}
            selectedVideoId={selectedVideoId}
          />
        </div>
      )}
    </div>
  );
};
