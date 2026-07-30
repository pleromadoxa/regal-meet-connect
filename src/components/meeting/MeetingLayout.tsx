
import React, { useEffect, useState } from 'react';
import { ResponsiveVideoGrid } from './ResponsiveVideoGrid';
import { AudioOnlyGrid } from './AudioOnlyGrid';
import { ParticipantsList } from './ParticipantsList';
import { HostPresentationLayout } from './HostPresentationLayout';
import { RemoteAudioMix } from './RemoteAudioMix';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

function useCompactMeetingLayout() {
  const [compact, setCompact] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches
  );

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1023px)');
    const onChange = () => setCompact(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return compact;
}

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
  onCloseParticipants: () => void;
  currentUserId: string;
  onToggleMute: (participantId: string, isMuted: boolean) => void;
  presentationActive?: boolean;
  presenterName?: string | null;
  localScreenStream?: MediaStream | null;
  hostScreenStream?: MediaStream | null;
  participantCount?: number;
  meetingTitle?: string;
  raisedHands?: Set<string>;
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
  onCloseParticipants,
  currentUserId,
  onToggleMute,
  presentationActive = false,
  presenterName,
  localScreenStream,
  hostScreenStream,
  participantCount,
  meetingTitle,
  raisedHands = new Set(),
}: MeetingLayoutProps) => {
  const isCompact = useCompactMeetingLayout();
  const meetingId = window.location.pathname.split('/meeting/')[1]?.split('?')[0] || '';

  const remoteStreamMap = React.useMemo(() => {
    const map = new Map<string, MediaStream>();
    remoteStreams.forEach((r) => map.set(r.id, r.stream));
    return map;
  }, [remoteStreams]);

  const hasAnyVideo =
    !presentationActive &&
    (isVideoEnabled || remoteStreams.some((stream) => stream.stream?.getVideoTracks()?.some((track) => track.enabled)));

  const participantsPanel = (
    <ParticipantsList
      participants={participants}
      remoteStreams={remoteStreams}
      localStream={localStream}
      isCurrentUserHost={isCurrentUserHost}
      currentUserId={currentUserId}
      userName={userName}
      meetingId={meetingId}
      onClose={onCloseParticipants}
      onToggleMute={onToggleMute}
      onSelectVideo={onVideoSelect}
      selectedVideoId={selectedVideoId}
      raisedHands={raisedHands}
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <RemoteAudioMix streams={remoteStreamMap} />

      {presentationActive ? (
        <HostPresentationLayout
          meetingTitle={meetingTitle}
          isHost={isCurrentUserHost}
          userName={userName}
          userId={currentUserId}
          participants={participants}
          presentationActive
          presenterName={presenterName}
          screenStream={hostScreenStream ?? null}
          localScreenStream={localScreenStream}
          participantCount={participantCount ?? participants.length + 1}
          isCurrentUserHost={isCurrentUserHost}
          onToggleMute={onToggleMute}
        />
      ) : (
    <div className="flex flex-1 flex-col lg:flex-row gap-4 p-4 overflow-hidden min-h-0">
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

      {/* Desktop sidebar */}
      {showParticipants && !isCompact && (
        <div className="hidden lg:block w-80 shrink-0 bg-slate-900/95 backdrop-blur-lg border border-slate-700/50 rounded-lg overflow-hidden">
          {participantsPanel}
        </div>
      )}

      <Sheet open={showParticipants && isCompact} onOpenChange={(open) => !open && onCloseParticipants()}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-slate-900 border-slate-700 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Participants</SheetTitle>
          </SheetHeader>
          {participantsPanel}
        </SheetContent>
      </Sheet>
    </div>
      )}
    </div>
  );
};
