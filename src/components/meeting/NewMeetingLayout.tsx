
import React from 'react';
import { OptimizedVideoGrid } from './OptimizedVideoGrid';
import { ParticipantsSidebar } from './ParticipantsSidebar';
import { AudioOnlyGrid } from './AudioOnlyGrid';
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
  currentUserId: string;
  onToggleMute: (participantId: string, isMuted: boolean) => void;
  speakingParticipants?: Set<string>;
  isVideoMode?: boolean;
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
  currentUserId,
  onToggleMute,
  speakingParticipants = new Set(),
  isVideoMode = true
}: NewMeetingLayoutProps) => {
  const isMobile = useIsMobile();

  const totalParticipants = remoteStreams.length + 1;

  // If in audio-only mode, show the audio-only grid interface
  if (!isVideoMode) {
    return (
      <div className="flex-1">
        <AudioOnlyGrid
          localStream={localStream}
          remoteStreams={remoteStreams}
          userName={userName}
          isCurrentUserHost={isCurrentUserHost}
          participants={participants}
          currentUserId={currentUserId}
          onToggleMute={onToggleMute}
          speakingParticipants={speakingParticipants}
        />
      </div>
    );
  }

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

      {/* Participants sidebar - always visible on desktop */}
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
