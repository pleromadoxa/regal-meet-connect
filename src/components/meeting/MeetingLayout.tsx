import React from 'react';
import { ParticipantsList } from '@/components/ParticipantsList';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { RemoteAudioMix } from './RemoteAudioMix';
import { RegalGlassMeetingLayout } from './RegalGlassMeetingLayout';
import { RegalGlassAudioLayout } from './RegalGlassAudioLayout';
import { HostPresentationLayout } from './HostPresentationLayout';

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
  const remoteStreamMap = React.useMemo(() => {
    const map = new Map<string, MediaStream>();
    remoteStreams.forEach((r) => map.set(r.id, r.stream));
    return map;
  }, [remoteStreams]);

  const hasAnyVideo =
    !presentationActive &&
    (isVideoEnabled ||
      remoteStreams.some((stream) =>
        stream.stream?.getVideoTracks()?.some((track) => track.enabled)
      ));

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
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
      ) : hasAnyVideo ? (
        <RegalGlassMeetingLayout
          localStream={localStream}
          remoteStreams={remoteStreams}
          userName={userName}
          isVideoEnabled={isVideoEnabled}
          selectedVideoId={selectedVideoId}
          onVideoSelect={onVideoSelect}
          isCurrentUserHost={isCurrentUserHost}
          participants={participants}
          currentUserId={currentUserId}
          raisedHands={raisedHands}
        />
      ) : (
        <RegalGlassAudioLayout
          localStream={localStream}
          remoteStreams={remoteStreams}
          userName={userName}
          selectedParticipantId={selectedVideoId}
          onSelectParticipant={onVideoSelect}
          isCurrentUserHost={isCurrentUserHost}
          participants={participants}
          currentUserId={currentUserId}
          raisedHands={raisedHands}
        />
      )}

      <Sheet open={showParticipants} onOpenChange={(open) => !open && onCloseParticipants()}>
        <SheetContent
          side="right"
          className="w-full border-white/10 bg-[#0b0b0f]/95 p-0 text-white backdrop-blur-xl sm:max-w-sm"
        >
          <SheetHeader className="border-b border-white/10 px-4 py-4">
            <SheetTitle className="text-left text-white">
              Participants ({participants.length})
            </SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto p-4">
            <ParticipantsList
              participants={participants}
              remoteStreams={remoteStreams}
              localStream={localStream}
              currentUserId={currentUserId}
              isHost={isCurrentUserHost}
              onToggleMute={onToggleMute}
              onSelectVideo={(id) => {
                onVideoSelect(id === currentUserId ? 'local' : id);
                onCloseParticipants();
              }}
              selectedVideoId={selectedVideoId === 'local' ? currentUserId : selectedVideoId}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
