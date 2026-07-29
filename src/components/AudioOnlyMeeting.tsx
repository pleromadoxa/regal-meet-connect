import React, { useEffect, useMemo, useState } from 'react';
import { VideoControls } from '@/components/VideoControls';
import { CaptionsDisplay } from '@/components/CaptionsDisplay';
import { MeetingHeader } from '@/components/meeting/MeetingHeader';
import { HostPresentationLayout } from '@/components/meeting/HostPresentationLayout';
import { RemoteAudioMix } from '@/components/meeting/RemoteAudioMix';
import {
  useMeetingState as useMeetingHooks,
  useHandRaiseNotifications,
  useFullscreenHandler,
  useConnectionQuality,
} from '@/components/meeting/MeetingHooks';
import { useMeetingState } from '@/hooks/useMeetingState';
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
import { Mic, MicOff, Monitor, MonitorOff, PhoneCall } from 'lucide-react';
import { useMeetingTopology } from '@/hooks/useMeetingTopology';
import { useMeetingPlanContext } from '@/hooks/useMeetingPlanContext';
import { useMeetingDurationLimit } from '@/hooks/useMeetingPlanEnforcement';
import type { MeetingMediaRoutingOptions } from '@/lib/meetingTopology';
import { useCloudflareSfu } from '@/hooks/useCloudflareSfu';
import { LargeMeetingBanner } from '@/components/meeting/LargeMeetingBanner';
import { Button } from '@/components/ui/button';

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
}: AudioOnlyMeetingProps) => {
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showParticipantsList, setShowParticipantsList] = useState(true);
  const { addRecentMeeting } = useRecentMeetings();
  const { logMeetingLeave, logFeatureUsage } = usePlatformLogging();

  const {
    currentParticipantId,
    setCurrentParticipantId,
    currentMeeting,
    setCurrentMeeting,
    isFullscreen,
    setIsFullscreen,
    handNotifications,
    setHandNotifications,
  } = useMeetingHooks(meetingId, userName);

  const {
    participants: dbParticipants,
    meetingUuid,
    meetingHostId: meetingHostIdFromLookup,
    removeParticipant: removeDbParticipant,
  } = useRealTimeParticipants(meetingId, user?.id || '', userName, isHost);

  const { toggleMuteParticipant } = useMeetingManagement();

  const isCurrentUserHost =
    isHost || meetingHostIdFromLookup === user?.id || dbParticipants.some((p) => p.user_id === user?.id && p.is_host);

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
    initialize,
    cleanup,
    connectedPeers,
    peerUserNames,
    connectionQuality,
    isOptimizing,
    setQualityOverride,
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

  useHandRaiseNotifications(meetingId, userName, setHandNotifications);
  const { toggleFullscreen } = useFullscreenHandler(setIsFullscreen);
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
  }, [
    dbParticipants,
    peerUserNames,
    user?.id,
    userName,
    isCurrentUserHost,
    isAudioEnabled,
  ]);

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

  return (
    <div className="flex min-h-screen-safe flex-col bg-[#121212] text-white">
      <RemoteAudioMix streams={remoteStreams} />

      <LargeMeetingBanner
        mediaMode={topology.mediaMode}
        mediaRole={topology.mediaRole}
        participantCount={displayParticipantCount}
        sfuAvailable={topology.sfuAvailable}
      />

      <MeetingHeader
        meetingId={meetingId}
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
        onSignOut={async () => {
          cleanup();
          await signOut();
        }}
      />

      {showParticipantsList ? (
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
        <div className="flex flex-1 items-center justify-center p-6 text-white/50 text-sm">
          Participants panel hidden — tap People to show the list
        </div>
      )}

      <CaptionsDisplay
        captions={captions}
        participants={presentationParticipants}
        isVisible={captionsEnabled}
      />

      <div className="border-t border-white/10 bg-black/40 p-3 backdrop-blur-md safe-area-inset-bottom">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-3">
          <Button
            size="lg"
            variant={isAudioEnabled ? 'secondary' : 'destructive'}
            className="h-12 w-12 rounded-full p-0"
            onClick={enhancedToggleAudio}
            aria-label={isAudioEnabled ? 'Mute' : 'Unmute'}
          >
            {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>

          {isCurrentUserHost && (
            <Button
              size="lg"
              className={`h-12 rounded-full px-5 ${
                isScreenSharing
                  ? 'bg-orange-500 hover:bg-orange-600'
                  : 'bg-white/10 hover:bg-white/20'
              }`}
              onClick={handlePresentationToggle}
            >
              {isScreenSharing ? (
                <>
                  <MonitorOff className="mr-2 h-5 w-5" />
                  Stop presenting
                </>
              ) : (
                <>
                  <Monitor className="mr-2 h-5 w-5" />
                  Present screen
                </>
              )}
            </Button>
          )}

          <Button
            size="lg"
            variant={captionsEnabled ? 'default' : 'secondary'}
            className="h-12 rounded-full px-4"
            onClick={() => {
              toggleCaptions();
              logFeatureUsage('toggle_captions', user?.id);
            }}
          >
            CC
          </Button>

          <Button
            size="lg"
            variant="destructive"
            className="h-12 w-12 rounded-full p-0"
            onClick={handleLeaveMeeting}
            aria-label="Leave meeting"
          >
            <PhoneCall className="h-5 w-5 rotate-[135deg]" />
          </Button>
        </div>
        {displayParticipantCount > 50 && (
          <p className="mt-2 text-center text-xs text-white/35">
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
