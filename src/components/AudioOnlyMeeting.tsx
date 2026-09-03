import React, { useEffect, useMemo, useState } from 'react';
import { CaptionsDisplay } from '@/components/CaptionsDisplay';
import { MeetingHeader } from '@/components/meeting/MeetingHeader';
import { HostPresentationLayout } from '@/components/meeting/HostPresentationLayout';
import { RegalGlassAudioLayout } from '@/components/meeting/RegalGlassAudioLayout';
import { RemoteAudioMix } from '@/components/meeting/RemoteAudioMix';
import { VideoControlsDock } from '@/components/VideoControlsDock';
import { VideoReactions } from '@/components/VideoReactions';
import { InMeetingChat } from '@/components/InMeetingChat';
import {
  useMeetingShellState,
  useFullscreenHandler,
  useConnectionQuality,
} from '@/components/meeting/MeetingHooks';
import { useMeetingState } from '@/hooks/useMeetingState';
import { useMeetingHandsChannel } from '@/hooks/useMeetingHandsChannel';
import { useAudioOnlyWebRTC } from '@/hooks/useAudioOnlyWebRTC';
import { useMeetingManagement } from '@/hooks/useMeetingManagement';
import { useRealTimeParticipants } from '@/hooks/useRealTimeParticipants';
import { enrichParticipantNames } from '@/lib/participantNames';
import { useMeetingPresentation } from '@/hooks/useMeetingPresentation';
import { useCaptions } from '@/hooks/useCaptions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useRecentMeetings } from '@/hooks/useRecentMeetings';
import { usePlatformLogging } from '@/hooks/usePlatformLogging';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare } from 'lucide-react';
import { useMeetingTopology } from '@/hooks/useMeetingTopology';
import { useMeetingPlanContext } from '@/hooks/useMeetingPlanContext';
import { useMeetingDurationLimit } from '@/hooks/useMeetingPlanEnforcement';
import type { MeetingMediaRoutingOptions } from '@/lib/meetingTopology';
import { useCloudflareSfu } from '@/hooks/useCloudflareSfu';
import { LargeMeetingBanner } from '@/components/meeting/LargeMeetingBanner';
import { cn } from '@/lib/utils';

interface AudioOnlyMeetingProps {
  meetingId: string;
  userName: string;
  isHost?: boolean;
  onLeaveMeeting: () => void;
  onNavigateToDashboard?: () => void;
}

export const AudioOnlyMeeting = ({
  meetingId,
  userName,
  isHost = false,
  onLeaveMeeting,
  onNavigateToDashboard,
}: AudioOnlyMeetingProps) => {
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showParticipantsList, setShowParticipantsList] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] = useState('local');
  const { addRecentMeeting } = useRecentMeetings();
  const { logMeetingLeave, logFeatureUsage } = usePlatformLogging();

  const {
    currentParticipantId,
    setCurrentParticipantId,
    currentMeeting,
    setCurrentMeeting,
    isFullscreen,
    setIsFullscreen,
  } = useMeetingShellState(meetingId, userName);

  const [handRaised, setHandRaised] = useState(false);
  const { broadcastHandRaise, handNotifications, raisedHands } = useMeetingHandsChannel(meetingId, {
    userName,
    onRemoteHandRaise: (payload) => {
      if (!payload.handRaised) return;
      toast({
        title: 'Hand raised',
        description: `${payload.userName} has raised their hand`,
        duration: 5000,
      });
    },
  });

  const {
    participants: dbParticipants,
    meetingUuid,
    meetingHostId: meetingHostIdFromLookup,
    removeParticipant: removeDbParticipant,
  } = useRealTimeParticipants(meetingId, user?.id || '', userName, isHost);

  const { toggleMuteParticipant } = useMeetingManagement();

  const isCurrentUserHost =
    isHost ||
    meetingHostIdFromLookup === user?.id ||
    dbParticipants.some((p) => p.user_id === user?.id && p.is_host);

  const participantCount = Math.max(dbParticipants.length, 1);

  const hostUserIdFromDb =
    dbParticipants.find((p) => p.is_host)?.user_id ??
    meetingHostIdFromLookup ??
    (isCurrentUserHost ? user?.id : null);

  const { limits: planLimits, isPaid } = useMeetingPlanContext(hostUserIdFromDb);
  const [meetingStartedAt] = useState(() => Date.now());
  useMeetingDurationLimit(planLimits, isPaid, meetingStartedAt);

  const topology = useMeetingTopology({
    meetingId,
    userId: user?.id || '',
    isHost: isCurrentUserHost,
    participantCount,
    hostUserId: hostUserIdFromDb,
    planLimits,
  });

  const mediaRouting: MeetingMediaRoutingOptions = useMemo(
    () => ({
      useMesh: topology.useMesh,
      shouldConnectToPeer: topology.shouldConnectToPeer,
      publishToMesh: topology.mediaRole === 'publisher',
    }),
    [topology.useMesh, topology.shouldConnectToPeer, topology.mediaRole]
  );

  const {
    localStream,
    remoteStreams: meshRemoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    screenShareStream,
    hostScreenStream: meshHostScreenStream,
    toggleScreenShare,
    toggleAudio,
    toggleCamera,
    initialize,
    cleanup,
    connectedPeers,
    peerUserNames,
    connectionQuality,
    isOptimizing,
    speakingParticipants,
  } = useAudioOnlyWebRTC(meetingId, userName, user?.id || '', mediaRouting);

  const sfu = useCloudflareSfu({
    meetingId,
    userId: user?.id || '',
    userName,
    enabled: topology.useSfu,
    isPublisher: topology.mediaRole === 'publisher',
    localStream,
    screenShareStream,
  });

  const remoteStreams = topology.useSfu ? sfu.remoteStreams : meshRemoteStreams;
  const meshOrSfuHostScreen = topology.useSfu ? sfu.hostScreenStream : meshHostScreenStream;

  const { presentationActive, presenterName, presenterId, setPresentation } = useMeetingPresentation(
    meetingId,
    user?.id || ''
  );

  const { updateParticipantAudioState } = useMeetingState(meetingId, user?.id || '');
  const { captions, isEnabled: captionsEnabled, toggleCaptions } = useCaptions(
    meetingId,
    currentParticipantId
  );

  const { toggleFullscreen } = useFullscreenHandler(setIsFullscreen);

  const handleToggleHand = async () => {
    const next = !handRaised;
    setHandRaised(next);
    const sent = await broadcastHandRaise({
      userName,
      handRaised: next,
      timestamp: Date.now(),
    });
    if (!sent) {
      setHandRaised(!next);
      toast({
        title: 'Hand raise failed',
        description: 'Could not reach other participants.',
        variant: 'destructive',
      });
    }
  };
  useConnectionQuality(connectedPeers, dbParticipants, () => {});

  const displayParticipantCount = Math.max(participantCount, connectedPeers.length + 1, 1);

  const presentationParticipants = useMemo(() => {
    let base = dbParticipants.map((p) => ({
      id: p.id,
      user_id: p.user_id,
      user_name: p.user_name,
      is_host: p.is_host,
      is_muted: p.is_muted,
      joined_at: p.joined_at,
    }));

    if (user?.id && !base.some((p) => p.user_id === user.id)) {
      base = [
        {
          id: `local-${user.id}`,
          user_id: user.id,
          user_name: userName,
          is_host: isCurrentUserHost,
          is_muted: !isAudioEnabled,
          joined_at: new Date().toISOString(),
        },
        ...base,
      ];
    }

    return enrichParticipantNames(base, peerUserNames);
  }, [dbParticipants, peerUserNames, user?.id, userName, isCurrentUserHost, isAudioEnabled]);

  const remoteStreamsArray = useMemo(() => {
    if (!(remoteStreams instanceof Map)) {
      return [] as { id: string; stream: MediaStream; userName: string }[];
    }
    return Array.from(remoteStreams.entries()).map(([id, stream]) => ({
      id,
      stream,
      userName:
        peerUserNames.get(id) ||
        presentationParticipants.find((p) => p.user_id === id)?.user_name ||
        'Guest',
    }));
  }, [remoteStreams, peerUserNames, presentationParticipants]);

  const effectivePresentation = presentationActive || isScreenSharing;

  const [presentationStreamTick, setPresentationStreamTick] = useState(0);
  useEffect(() => {
    if (!effectivePresentation || isCurrentUserHost) return;
    const timer = window.setInterval(() => {
      setPresentationStreamTick((t) => t + 1);
    }, 400);
    return () => window.clearInterval(timer);
  }, [effectivePresentation, isCurrentUserHost]);

  const resolvedPresenterId =
    presenterId ?? hostUserIdFromDb ?? dbParticipants.find((p) => p.is_host)?.user_id ?? null;

  const presenterRemoteStream = useMemo(() => {
    if (!(remoteStreams instanceof Map) || !resolvedPresenterId) return null;
    const direct = remoteStreams.get(resolvedPresenterId);
    if (direct?.getVideoTracks().some((t) => t.readyState === 'live')) return direct;

    if (!effectivePresentation) return null;
    for (const stream of remoteStreams.values()) {
      if (stream.getVideoTracks().some((t) => t.readyState === 'live')) return stream;
    }
    return null;
  }, [remoteStreams, resolvedPresenterId, effectivePresentation, presentationStreamTick]);

  const hostScreenStream = useMemo(() => {
    if (isCurrentUserHost && isScreenSharing && screenShareStream) return screenShareStream;
    if (meshOrSfuHostScreen) return meshOrSfuHostScreen;
    if (effectivePresentation && presenterRemoteStream) return presenterRemoteStream;
    return null;
  }, [
    isCurrentUserHost,
    isScreenSharing,
    screenShareStream,
    meshOrSfuHostScreen,
    effectivePresentation,
    presenterRemoteStream,
  ]);

  useEffect(() => {
    if (!isScreenSharing && presentationActive && isCurrentUserHost) {
      setPresentation(false);
    }
  }, [isScreenSharing, presentationActive, isCurrentUserHost, setPresentation]);

  useEffect(() => {
    if (!meetingId || !userName || !user?.id) return;

    const persist = () => {
      localStorage.setItem(
        'currentMeeting',
        JSON.stringify({
          meetingId,
          userName,
          isHost,
          userId: user.id,
          timestamp: Date.now(),
          audioOnly: true,
        })
      );
    };

    persist();
    const interval = setInterval(persist, 30_000);
    return () => clearInterval(interval);
  }, [meetingId, userName, isHost, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    initialize();
    return () => {
      if (sessionStorage.getItem('meeting-mode-switch') === meetingId) {
        sessionStorage.removeItem('meeting-mode-switch');
        return;
      }
      cleanup();
    };
  }, [meetingId, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const row = dbParticipants.find((p) => p.user_id === user.id);
    if (row) setCurrentParticipantId(row.id);
  }, [dbParticipants, user?.id, setCurrentParticipantId]);

  useEffect(() => {
    if (!meetingUuid || currentMeeting) return;
    let cancelled = false;
    void supabase
      .from('meetings')
      .select('*')
      .eq('id', meetingUuid)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) {
          setCurrentMeeting(data);
          addRecentMeeting(meetingId, data.title, isHost);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [meetingUuid, currentMeeting, meetingId, isHost, addRecentMeeting, setCurrentMeeting]);

  const enhancedToggleAudio = async () => {
    const newState = await toggleAudio();
    logFeatureUsage('toggle_audio', user?.id);
    const actual = typeof newState === 'boolean' ? newState : !isAudioEnabled;
    if (currentParticipantId) {
      updateParticipantAudioState(currentParticipantId, actual);
    }
  };

  const handlePresentationToggle = async () => {
    if (!isCurrentUserHost) {
      toast({
        title: 'Host only',
        description: 'Only the host can present their screen.',
        variant: 'destructive',
      });
      return;
    }
    if (!isScreenSharing) {
      setPresentation(true, userName);
    }
    await toggleScreenShare((active) => {
      if (!active) setPresentation(false);
    });
  };

  const handleToggleVideoMode = () => {
    if (isVideoEnabled) {
      void toggleCamera();
      return;
    }

    sessionStorage.setItem('meeting-mode-switch', meetingId);
    const params = new URLSearchParams({ userName });
    if (isHost) params.set('host', 'true');
    navigate(`/meeting/${meetingId}?${params.toString()}`);
  };

  const copyMeetingId = () => {
    navigator.clipboard.writeText(meetingId);
    toast({ title: 'Meeting ID copied' });
  };

  const handleLeaveMeeting = () => {
    logMeetingLeave(meetingId, user?.id);
    void removeDbParticipant();
    localStorage.removeItem('currentMeeting');
    if (isScreenSharing) setPresentation(false);
    cleanup();
    onLeaveMeeting();
  };

  const handleToggleMute = (participantId: string, muted: boolean) => {
    if (!isCurrentUserHost) return;
    toggleMuteParticipant(participantId, muted);
  };

  const handleNavigateBack = () => {
    if (onNavigateToDashboard) {
      onNavigateToDashboard();
      return;
    }
    navigate('/dashboard');
  };

  return (
    <div className="relative min-h-screen-safe h-screen-safe overflow-hidden bg-[#0b0b0f] text-white">
      <RemoteAudioMix streams={remoteStreams} />

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <LargeMeetingBanner
          mediaMode={topology.mediaMode}
          mediaRole={topology.mediaRole}
          participantCount={displayParticipantCount}
          sfuAvailable={topology.sfuAvailable}
          connectionError={topology.useSfu ? sfu.connectionError : null}
          onRetryConnection={topology.useSfu ? () => void sfu.retryConnection() : undefined}
        />

        <MeetingHeader
          meetingId={meetingId}
          meetingTitle={currentMeeting?.title}
          isCurrentUserHost={isCurrentUserHost}
          totalParticipantCount={displayParticipantCount}
          handNotifications={handNotifications}
          isFullscreen={isFullscreen}
          showParticipants={showParticipantsList}
          isVideoMode={false}
          onCopyMeetingId={copyMeetingId}
          onToggleFullscreen={toggleFullscreen}
          onToggleParticipants={() => setShowParticipantsList((v) => !v)}
          onToggleVideoMode={handleToggleVideoMode}
          onNavigateToSettings={() => navigate('/settings')}
          onNavigateBack={handleNavigateBack}
          onSignOut={async () => {
            cleanup();
            await signOut();
          }}
        />

        {effectivePresentation ? (
          <HostPresentationLayout
            meetingTitle={currentMeeting?.title}
            meetingDescription={currentMeeting?.description}
            isHost={isCurrentUserHost}
            userName={userName}
            userId={user?.id || ''}
            participants={presentationParticipants}
            speakingUserIds={speakingParticipants}
            presentationActive={effectivePresentation}
            presenterName={isCurrentUserHost && isScreenSharing ? userName : presenterName}
            screenStream={hostScreenStream}
            localScreenStream={screenShareStream}
            participantCount={displayParticipantCount}
            isCurrentUserHost={isCurrentUserHost}
            onToggleMute={handleToggleMute}
          />
        ) : (
          <RegalGlassAudioLayout
            localStream={localStream}
            remoteStreams={remoteStreamsArray}
            userName={userName}
            selectedParticipantId={selectedParticipantId}
            onSelectParticipant={setSelectedParticipantId}
            isCurrentUserHost={isCurrentUserHost}
            participants={presentationParticipants}
            currentUserId={user?.id || ''}
            speakingParticipants={speakingParticipants}
            raisedHands={raisedHands}
          />
        )}

        <CaptionsDisplay
          captions={captions}
          participants={presentationParticipants}
          isVisible={captionsEnabled}
        />

        <VideoControlsDock
          isVideoEnabled={false}
          isAudioEnabled={isAudioEnabled}
          isScreenSharing={isScreenSharing}
          captionsEnabled={captionsEnabled}
          showSettings={false}
          showChat={showChat}
          handRaised={handRaised}
          onToggleVideo={handleToggleVideoMode}
          onToggleAudio={() => void enhancedToggleAudio()}
          onToggleScreenShare={() => void handlePresentationToggle()}
          onSwitchCamera={() => undefined}
          onToggleCaptions={() => {
            toggleCaptions();
            logFeatureUsage('toggle_captions', user?.id);
          }}
          onToggleSettings={() => navigate('/settings')}
          onToggleChat={() => setShowChat((v) => !v)}
          onToggleHand={() => void handleToggleHand()}
          onToggleEffects={() => undefined}
          onNavigateToDashboard={handleNavigateBack}
          onLeaveMeeting={handleLeaveMeeting}
          onToggleParticipants={() => setShowParticipantsList((v) => !v)}
        />

        <div className="fixed right-3 top-[42%] z-[60] -translate-y-1/2 sm:right-4 sm:top-1/2">
          <VideoReactions meetingId={meetingId} userId={user?.id} userName={userName} />
        </div>

        <button
          type="button"
          onClick={() => setShowChat((v) => !v)}
          aria-label={showChat ? 'Close chat' : 'Open chat'}
          className={cn(
            'fixed bottom-4 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full',
            'bg-[hsl(var(--accent))] text-white shadow-2xl shadow-purple-900/40',
            'transition hover:brightness-110 active:scale-95',
            'safe-area-inset-bottom sm:bottom-6 sm:right-6',
            showChat && 'ring-2 ring-white/40'
          )}
        >
          <MessageSquare className="h-6 w-6" />
        </button>

        {showChat && (
          <InMeetingChat
            meetingId={meetingId}
            userName={userName}
            onClose={() => setShowChat(false)}
          />
        )}

        {displayParticipantCount > 50 && (
          <p className="pointer-events-none absolute bottom-24 left-1/2 z-30 -translate-x-1/2 text-center text-xs text-white/40">
            Large meeting — {topology.isSfuMode ? 'SFU' : topology.mediaMode} ·{' '}
            {topology.isListener ? 'listening' : 'speaking'} · {displayParticipantCount} people
            {connectionQuality ? ` · ${connectionQuality}` : ''}
            {isOptimizing ? ' · tuning' : ''}
          </p>
        )}
      </div>
    </div>
  );
};
