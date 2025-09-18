
import React from 'react';
import { OptimizedVideoGrid } from './OptimizedVideoGrid';
import { ParticipantsSidebar } from './ParticipantsSidebar';
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
  speakingParticipants?: Set<string>;
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
  onToggleMute,
  speakingParticipants = new Set()
}: NewMeetingLayoutProps) => {
  const isMobile = useIsMobile();

  const totalParticipants = remoteStreams.length + 1;

  // Debug logging for sidebar state
  console.log('NewMeetingLayout render:', {
    isMobile,
    totalParticipants,
    showParticipants,
    remoteStreamsCount: remoteStreams.length
  });

  if (isMobile) {
    return (
      <div className="flex-1 relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <OptimizedVideoGrid
          localStream={localStream}
          remoteStreams={remoteStreams}
          userName={userName}
          isVideoEnabled={isVideoEnabled}
          participants={participants}
          currentUserId={currentUserId}
          isCurrentUserHost={isCurrentUserHost}
          speakingParticipants={speakingParticipants}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 gap-4 overflow-hidden">
      {/* For smaller meetings, use optimized grid in main area */}
      <div className="flex-1">
        <OptimizedVideoGrid
          localStream={localStream}
          remoteStreams={remoteStreams}
          userName={userName}
          isVideoEnabled={isVideoEnabled}
          participants={participants}
          currentUserId={currentUserId}
          isCurrentUserHost={isCurrentUserHost}
          speakingParticipants={speakingParticipants}
        />
      </div>

      {/* Participants sidebar - now available for all desktop meetings */}
      {showParticipants && (
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
      )}
    </div>
  );
};
