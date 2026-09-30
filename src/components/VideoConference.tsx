import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebRTC } from '@/hooks/useWebRTC';
import { MeetingHeader } from './meeting/MeetingHeader';
import { LargeMeetingBanner } from './meeting/LargeMeetingBanner';
import { MeetingLayout } from './meeting/MeetingLayout';
import { VideoControls } from './VideoControls';
import { CaptionsDisplay } from './CaptionsDisplay';
import { useCaptions } from '@/hooks/useCaptions';
import { BackgroundMeetingIndicator } from './BackgroundMeetingIndicator';
import { useBackgroundMeeting } from '@/hooks/useBackgroundMeeting';
import { useRealTimeParticipants, type MeetingPresenceSignal } from '@/hooks/useRealTimeParticipants';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ParticipantJoinLeaveNotifications } from './meeting/ParticipantJoinLeaveNotifications';
import { ConnectionQualityIndicator } from './meeting/ConnectionQualityIndicator';
import { MediaPermissionsModal } from './meeting/MediaPermissionsModal';
import { useMediaPermissions } from '@/hooks/useMediaPermissions';
import { useLobbyHost } from '@/hooks/useLobbyHost';
import { useMeetingHandsChannel } from '@/hooks/useMeetingHandsChannel';
import { useMeetingPresentation } from '@/hooks/useMeetingPresentation';
import { useMeetingTopology } from '@/hooks/useMeetingTopology';
import { useMeetingPlanContext } from '@/hooks/useMeetingPlanContext';
import { useMeetingDurationLimit } from '@/hooks/useMeetingPlanEnforcement';
import { useCloudflareSfu } from '@/hooks/useCloudflareSfu';
import { useIsMobile } from '@/hooks/use-mobile';
import { MeetingReactionsShell } from '@/components/meeting/MeetingReactionsShell';
import { MeetingConnectingShell } from '@/components/meeting/MeetingConnectingShell';
import { RegalBriefPanel } from '@/components/meeting/RegalBriefPanel';
import { LivePulseBanner } from '@/components/meeting/LivePulseBanner';
import { useMultiParticipantSpeakingDetection } from '@/hooks/useSpeakingDetection';
import type { MeetingMediaRoutingOptions } from '@/lib/meetingTopology';
import { buildGuestInviteText } from '@/lib/meeting';
import { supabase } from '@/integrations/supabase/client';
import { resolveParticipantDisplayName, enrichParticipantNames } from '@/lib/participantNames';
import {
  playBrandAnnouncement,
  preloadBrandAnnouncement,
  unlockBrandAnnouncement,
} from '@/lib/brandAnnouncement';

interface VideoConferenceProps {
  meetingId: string;
  userName: string;
  isHost?: boolean;
  onLeaveMeeting: () => void;
  onNavigateToDashboard?: () => void;
}

const NO_PRESENCE_PEERS = new Set<string>();

export const VideoConference = ({ 
  meetingId, 
  userName, 
  isHost = false, 
  onLeaveMeeting,
  onNavigateToDashboard
}: VideoConferenceProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [selectedVideoId, setSelectedVideoId] = useState('local');
  const [showParticipants, setShowParticipants] = useState(false);
  const [showMediaPermissions, setShowMediaPermissions] = useState(false);
  const [mediaInitTimedOut, setMediaInitTimedOut] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVideoMode, setIsVideoMode] = useState(true);
  const [handRaised, setHandRaised] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState<string | null>(null);
  const [showBrief, setShowBrief] = useState(false);

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

  const handleToggleHand = useCallback(async () => {
    const next = !handRaised;
    setHandRaised(next);

    if (!meetingId) return;

    const sent = await broadcastHandRaise({
      userName,
      handRaised: next,
      timestamp: Date.now(),
    });

    if (!sent) {
      setHandRaised(!next);
      toast({
        title: 'Hand raise failed',
        description: 'Could not reach other participants. Check your connection and try again.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: next ? 'Hand raised' : 'Hand lowered',
      description: next
        ? 'Other participants have been notified.'
        : 'Your hand has been lowered.',
      duration: 3000,
    });
  }, [handRaised, meetingId, broadcastHandRaise, userName, toast]);

  // Listen for guest "knock" requests when this user is the host
  const { pending: lobbyPending, admit: admitLobbyGuest, deny: denyLobbyGuest } = useLobbyHost(
    meetingId,
    isHost,
  );

  // Media permissions management
  const {
    permissions,
    requestPermissions,
    isSupported
  } = useMediaPermissions();

  // Live signalling presence, bridged into the roster hook below (it is
  // declared earlier because the meeting topology needs its participant count).
  const [rosterPresence, setRosterPresence] = useState<MeetingPresenceSignal>({
    peerIds: NO_PRESENCE_PEERS,
    synced: false,
  });

  // Real-time participants management
  const {
    participants: dbParticipants,
    meetingHostId: meetingHostIdFromLookup,
    updateParticipantStatus,
    removeParticipant: removeDbParticipant,
    setParticipantMuted,
    kickParticipant,
    syncLocalMute,
    removedFromMeeting,
  } = useRealTimeParticipants(meetingId, user?.id || '', userName, isHost, rosterPresence);

  const dbParticipantCount = Math.max(dbParticipants.length, 1);

  const hostUserIdFromDb =
    dbParticipants.find((p) => p.is_host)?.user_id ??
    meetingHostIdFromLookup ??
    (isHost ? user?.id : null);

  const { limits: planLimits, isPaid } = useMeetingPlanContext(hostUserIdFromDb);
  const [meetingStartedAt] = useState(() => Date.now());
  useMeetingDurationLimit(planLimits, isPaid, meetingStartedAt);

  const topology = useMeetingTopology({
    meetingId,
    userId: user?.id || '',
    isHost,
    participantCount: dbParticipantCount,
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

  // WebRTC management
  const {
    localStream,
    remoteStreams: meshRemoteStreams,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    screenShareStream,
    hostScreenStream: meshHostScreenStream,
    currentFacingMode,
    currentAudioDevice,
    currentVideoDevice,
    initialize,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    switchCamera,
    cleanup,
    connectedPeers,
    peerUserNames,
    peerConnections,
    presenceSynced,
    handleDeviceChange: switchMediaDevice,
    setPlanLimits,
  } = useWebRTC(meetingId, userName, user?.id || '', mediaRouting);

  useEffect(() => {
    setRosterPresence({ peerIds: new Set(connectedPeers), synced: presenceSynced });
  }, [connectedPeers, presenceSynced]);

  const {
    speakingParticipants,
    addParticipant,
    removeParticipant,
  } = useMultiParticipantSpeakingDetection();
  const speakingIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setPlanLimits(planLimits);
  }, [planLimits, setPlanLimits]);

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

  const participantsForUi = useMemo(() => {
    let base = dbParticipants;
    if (user?.id && !dbParticipants.some((p) => p.user_id === user.id)) {
      base = [
        {
          id: `local-${user.id}`,
          user_id: user.id,
          user_name: userName,
          is_host: isHost,
          is_muted: false,
          joined_at: new Date().toISOString(),
          is_video_enabled: isVideoEnabled,
          is_audio_enabled: isAudioEnabled,
          connection_quality: 'good' as const,
          last_seen: new Date().toISOString(),
        },
        ...dbParticipants,
      ];
    }
    return enrichParticipantNames(base, peerUserNames);
  }, [dbParticipants, user?.id, userName, isHost, isVideoEnabled, isAudioEnabled, peerUserNames]);

  const displayParticipantCount = Math.max(
    participantsForUi.length,
    connectedPeers.length + 1,
    1
  );

  const { presentationActive, presenterName, presenterId, setPresentation } = useMeetingPresentation(
    meetingId,
    user?.id || ''
  );

  // Also fall back to the actual remote screen track: if a viewer misses the
  // "presentation" broadcast they would otherwise render the shared screen in a
  // normal (cover-cropped) tile instead of the full projection layout.
  const effectivePresentation =
    presentationActive || isScreenSharing || Boolean(meshOrSfuHostScreen);

  const [presentationStreamTick, setPresentationStreamTick] = useState(0);
  useEffect(() => {
    if (!effectivePresentation || isHost) return;
    const timer = window.setInterval(() => {
      setPresentationStreamTick((t) => t + 1);
    }, 400);
    return () => window.clearInterval(timer);
  }, [effectivePresentation, isHost]);

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
    if (isHost && isScreenSharing && screenShareStream) return screenShareStream;
    if (meshOrSfuHostScreen) return meshOrSfuHostScreen;
    if (effectivePresentation && presenterRemoteStream) return presenterRemoteStream;
    return null;
  }, [
    isHost,
    isScreenSharing,
    screenShareStream,
    meshOrSfuHostScreen,
    effectivePresentation,
    presenterRemoteStream,
  ]);

  useEffect(() => {
    if (!isScreenSharing && presentationActive && isHost) {
      setPresentation(false);
    }
  }, [isScreenSharing, presentationActive, isHost, setPresentation]);

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
          audioOnly: false,
        })
      );
    };
    persist();
    const interval = setInterval(persist, 30_000);
    return () => clearInterval(interval);
  }, [meetingId, userName, isHost, user?.id]);

  const handleVisibilityChange = useCallback(
    (visible: boolean) => {
      if (!visible) {
        toast({
          title: 'Meeting in Background',
          description: 'Meeting will continue running while minimized',
          duration: 3000,
        });
      }
    },
    [toast]
  );

  const {
    isVisible,
    startMeeting,
    endMeeting
  } = useBackgroundMeeting({
    onVisibilityChange: handleVisibilityChange,
    enableWakeLock: true,
    maintainConnection: true
  });

  // Captions
  const { 
    captions, 
    isEnabled: captionsEnabled, 
    toggleCaptions 
  } = useCaptions(meetingId, user?.id || '');

  const remoteStreamsArray = useMemo(
    () =>
      Array.from(remoteStreams?.entries() || []).map(([id, stream]) => ({
        id,
        stream,
        userName: resolveParticipantDisplayName(id, participantsForUi, peerUserNames),
      })),
    [remoteStreams, participantsForUi, peerUserNames]
  );

  useEffect(() => {
    const next = new Set<string>();
    if (user?.id && localStream) {
      addParticipant(user.id, localStream);
      next.add(user.id);
    }
    for (const remote of remoteStreamsArray) {
      addParticipant(remote.id, remote.stream);
      next.add(remote.id);
    }
    for (const id of speakingIdsRef.current) {
      if (!next.has(id)) removeParticipant(id);
    }
    speakingIdsRef.current = next;
  }, [user?.id, localStream, remoteStreamsArray, addParticipant, removeParticipant]);

  const mediaStartedRef = useRef(false);
  const brandAnnouncedRef = useRef(false);

  const announceSpatialRegal = useCallback(() => {
    if (brandAnnouncedRef.current) return;
    brandAnnouncedRef.current = true;
    unlockBrandAnnouncement();
    window.setTimeout(() => {
      void playBrandAnnouncement({ meetingId });
    }, 450);
  }, [meetingId]);

  useEffect(() => {
    void preloadBrandAnnouncement();
    const unlock = () => unlockBrandAnnouncement();
    window.addEventListener('pointerdown', unlock, { once: true, capture: true });
    window.addEventListener('keydown', unlock, { once: true, capture: true });
    return () => {
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    };
  }, []);

  // Initialize WebRTC — on mobile, require a user gesture via the permissions dialog
  useEffect(() => {
    if (!user?.id || !meetingId || !userName) return;
    if (localStream || mediaStartedRef.current) return;

    if (!isSupported) {
      setShowMediaPermissions(true);
      return;
    }

    if (permissions.camera === 'denied' && permissions.microphone === 'denied') {
      setShowMediaPermissions(true);
      return;
    }

    if (isMobile) {
      setShowMediaPermissions(true);
      return;
    }

    let cancelled = false;

    const startMedia = async () => {
      if (cancelled || mediaStartedRef.current) return;
      mediaStartedRef.current = true;
      try {
        await initialize();
        if (!cancelled) {
          startMeeting();
          announceSpatialRegal();
        }
      } catch {
        mediaStartedRef.current = false;
        if (!cancelled) setShowMediaPermissions(true);
      }
    };

    const delay =
      permissions.camera === 'checking' || permissions.microphone === 'checking' ? 600 : 0;
    const timer = window.setTimeout(() => {
      void startMedia();
    }, delay);

    const timeoutTimer = window.setTimeout(() => {
      if (!cancelled) {
        setMediaInitTimedOut(true);
        setShowMediaPermissions(true);
      }
    }, 12_000);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearTimeout(timeoutTimer);
    };
  }, [
    meetingId,
    userName,
    user?.id,
    isSupported,
    isMobile,
    permissions.camera,
    permissions.microphone,
    localStream,
    initialize,
    startMeeting,
    announceSpatialRegal,
  ]);

  const cleanupRef = useRef(cleanup);
  const endMeetingRef = useRef(endMeeting);
  cleanupRef.current = cleanup;
  endMeetingRef.current = endMeeting;

  useEffect(() => {
    const onPageUnload = () => {
      void removeDbParticipant();
    };
    window.addEventListener('beforeunload', onPageUnload);
    return () => window.removeEventListener('beforeunload', onPageUnload);
  }, [removeDbParticipant]);

  useEffect(() => {
    return () => {
      cleanupRef.current();
      void endMeetingRef.current();
    };
  }, []);

  const handleLeaveMeeting = useCallback(() => {
    console.log('Leaving meeting...');
    cleanup();
    removeDbParticipant();
    endMeeting();
    onLeaveMeeting();
  }, [cleanup, removeDbParticipant, endMeeting, onLeaveMeeting]);

  const handleMediaPermissionRequest = async (video: boolean, audio: boolean) => {
    unlockBrandAnnouncement();
    const stream = await requestPermissions(video, audio);
    if (stream) {
      setShowMediaPermissions(false);
      setMediaInitTimedOut(false);
      mediaStartedRef.current = true;
      try {
        await initialize({ stream, video, audio });
        startMeeting();
        announceSpatialRegal();
      } catch {
        mediaStartedRef.current = false;
        setShowMediaPermissions(true);
      }
    }
  };

  const openMediaPermissions = useCallback(() => {
    setShowMediaPermissions(true);
  }, []);

  const handleToggleMute = (participantId: string, isMuted: boolean) => {
    if (!isHost) {
      toast({
        title: "Permission Denied",
        description: "Only the host can mute/unmute participants",
        variant: "destructive"
      });
      return;
    }

    void (async () => {
      const ok = await setParticipantMuted(participantId, isMuted);
      if (!ok) {
        toast({
          title: 'Could not update mute',
          description: 'That participant could not be reached. Try again.',
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: isMuted ? "Participant Muted" : "Participant Unmuted",
        description: "Host action applied successfully"
      });
    })();
  };

  const handleRemoveParticipant = (userId: string) => {
    if (!isHost) {
      toast({
        title: 'Permission Denied',
        description: 'Only the host can remove participants',
        variant: 'destructive',
      });
      return;
    }

    void (async () => {
      const target = participantsForUi.find((p) => p.user_id === userId);
      const ok = await kickParticipant(userId);
      if (!ok) {
        toast({
          title: 'Could not remove participant',
          description: 'That participant could not be removed. Try again.',
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Participant removed',
        description: `${target?.user_name ?? 'They'} ${target ? 'were' : 'was'} removed from the meeting.`,
      });
    })();
  };

  // The host removed this user from the meeting — leave immediately.
  useEffect(() => {
    if (!removedFromMeeting) return;
    toast({
      title: 'Removed from the meeting',
      description: 'The host removed you from this meeting.',
      variant: 'destructive',
      duration: 6000,
    });
    cleanup();
    if (onNavigateToDashboard) {
      onNavigateToDashboard();
    } else {
      handleLeaveMeeting();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [removedFromMeeting]);

  // Mirror the local mic state into the roster so the mute flags everyone else
  // sees stay truthful (host-driven mutes are written by setParticipantMuted).
  useEffect(() => {
    void syncLocalMute(!isAudioEnabled);
  }, [isAudioEnabled, syncLocalMute]);

  const copyMeetingId = () => {
    const text = buildGuestInviteText(meetingId);
    void navigator.clipboard.writeText(text);
    toast({
      title: 'Guest invite copied',
      description: 'Share the link so guests can join with just their name.',
    });
  };

  const handleDeviceChange = (type: 'audio' | 'video', deviceId: string) => {
    switchMediaDevice(deviceId, type === 'audio' ? 'audioinput' : 'videoinput');
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleToggleVideoMode = async () => {
    const newMode = !isVideoMode;
    setIsVideoMode(newMode);

    if (newMode) {
      const enabled = isVideoEnabled
        ? true
        : await toggleVideo();
      if (!enabled) {
        setIsVideoMode(false);
        return;
      }
    } else if (isVideoEnabled) {
      await toggleVideo();
    }

    toast({
      title: newMode ? 'Switched to Video Mode' : 'Switched to Audio-Only Mode',
      description: newMode ? 'Video is now enabled' : 'Meeting is now audio-only',
      duration: 3000,
    });
  };

  const handleNavigateToSettings = () => {
    navigate('/settings');
  };

  const handleSignOut = () => {
    handleLeaveMeeting();
  };

  const totalParticipantCount = displayParticipantCount;
  const showBackgroundIndicator = !isVisible && !!localStream;
  const showConnectingShell = !localStream && !showMediaPermissions;

  const handleToggleScreenShare = async () => {
    if (!isHost && !isScreenSharing) {
      toast({
        title: 'Host only',
        description: 'Only the host can present their screen.',
        variant: 'destructive',
      });
      return;
    }
    const wasSharing = isScreenSharing;
    if (!wasSharing) {
      setPresentation(true, userName);
    }
    await toggleScreenShare();
    if (wasSharing) {
      setPresentation(false);
    }
    // NOTE: we deliberately do NOT switch the camera off while presenting.
    // The video sender is already carrying the screen track, so nothing extra
    // is transmitted — and leaving the camera enabled means that when the
    // presentation ends (including via the browser's own "Stop sharing" button)
    // `replaceTrack(camera)` resumes live video immediately instead of
    // restoring a disabled track and showing everyone a black frame.
  };

  useEffect(() => {
    if (!meetingId) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('meetings')
        .select('title')
        .eq('meeting_id', meetingId)
        .maybeSingle();
      if (!cancelled && data?.title) {
        setMeetingTitle(String(data.title));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [meetingId]);

  return (
    <MeetingReactionsShell meetingId={meetingId} userId={user?.id} userName={userName}>
    <div className="relative min-h-screen-safe h-screen-safe overflow-hidden overscroll-none bg-[#0b0b0f] [touch-action:manipulation]">
      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <LargeMeetingBanner
          mediaMode={topology.mediaMode}
          mediaRole={topology.mediaRole}
          participantCount={totalParticipantCount}
          sfuAvailable={topology.sfuAvailable}
          connectionError={topology.useSfu ? sfu.connectionError : null}
          onRetryConnection={topology.useSfu ? () => void sfu.retryConnection() : undefined}
        />

        <div className="pointer-events-none absolute left-3 top-14 z-30 safe-area-inset-top sm:left-4 sm:top-16">
          <LivePulseBanner meetingCode={meetingId} compact />
        </div>

        <MeetingHeader
          meetingId={meetingId}
          meetingTitle={meetingTitle}
          isCurrentUserHost={isHost}
          totalParticipantCount={totalParticipantCount}
          handNotifications={handNotifications}
          isFullscreen={isFullscreen}
          showParticipants={showParticipants}
          isVideoMode={isVideoMode}
          onCopyMeetingId={copyMeetingId}
          onToggleFullscreen={handleToggleFullscreen}
          onToggleParticipants={() => setShowParticipants(!showParticipants)}
          onToggleVideoMode={handleToggleVideoMode}
          onNavigateToSettings={handleNavigateToSettings}
          onSignOut={handleSignOut}
          onNavigateBack={onNavigateToDashboard}
          statusAddon={<ConnectionQualityIndicator compact peerConnections={peerConnections} />}
        />

        <MeetingLayout
          localStream={localStream}
          remoteStreams={remoteStreamsArray}
          userName={userName}
          isVideoEnabled={isVideoEnabled && isVideoMode && !effectivePresentation}
          selectedVideoId={selectedVideoId}
          onVideoSelect={setSelectedVideoId}
          isCurrentUserHost={isHost}
          participants={participantsForUi}
          showParticipants={showParticipants}
          onCloseParticipants={() => setShowParticipants(false)}
          currentUserId={user?.id || ''}
          onToggleMute={handleToggleMute}
          onRemoveParticipant={handleRemoveParticipant}
          presentationActive={effectivePresentation}
          presenterName={
            isHost && isScreenSharing
              ? userName
              : presenterName ??
                (resolvedPresenterId
                  ? resolveParticipantDisplayName(
                      resolvedPresenterId,
                      dbParticipants,
                      peerUserNames,
                      'Host'
                    )
                  : null)
          }
          localScreenStream={screenShareStream}
          hostScreenStream={hostScreenStream}
          participantCount={totalParticipantCount}
          meetingTitle={meetingTitle ?? undefined}
          raisedHands={raisedHands}
          speakingParticipants={speakingParticipants}
        />

        {showConnectingShell && (
          <MeetingConnectingShell
            message="Setting up camera and microphone…"
            subMessage={
              mediaInitTimedOut
                ? 'Taking longer than expected. Tap below to allow access.'
                : 'Allow access when prompted, or use the button below.'
            }
            showActions={mediaInitTimedOut || isMobile}
            onRequestPermissions={openMediaPermissions}
            onJoinAudioOnly={() => void handleMediaPermissionRequest(false, true)}
          />
        )}

        {/* Join/Leave Notifications */}
        <ParticipantJoinLeaveNotifications
          participants={participantsForUi}
          currentUserId={user?.id || ''}
          participantCount={displayParticipantCount}
        />

        {/* Video Controls */}
        <VideoControls
          isVideoEnabled={isVideoEnabled}
          isAudioEnabled={isAudioEnabled}
          isScreenSharing={isScreenSharing}
          currentFacingMode={currentFacingMode}
          currentAudioDevice={currentAudioDevice}
          currentVideoDevice={currentVideoDevice}
          onToggleVideo={toggleVideo}
          onToggleAudio={toggleAudio}
          onToggleScreenShare={handleToggleScreenShare}
          onSwitchCamera={switchCamera}
          onLeaveMeeting={handleLeaveMeeting}
          onDeviceChange={handleDeviceChange}
          onToggleCaptions={toggleCaptions}
          captionsEnabled={captionsEnabled}
          userName={userName}
          userId={user?.id}
          meetingId={meetingId}
          handRaised={handRaised}
          onToggleHand={handleToggleHand}
          onToggleParticipants={() => setShowParticipants(!showParticipants)}
          onNavigateToDashboard={onNavigateToDashboard}
          onToggleBrief={() => setShowBrief((v) => !v)}
          showBrief={showBrief}
        />

        <RegalBriefPanel
          meetingCode={meetingId}
          open={showBrief}
          onOpenChange={setShowBrief}
          isLive
          isMeetingHost={isHost}
        />

        {/* Captions Display */}
        <CaptionsDisplay
          captions={captions}
          participants={participantsForUi}
          isVisible={captionsEnabled}
        />

        {/* Background Meeting Indicator */}
        {showBackgroundIndicator && (
          <BackgroundMeetingIndicator />
        )}

        {/* Host lobby admit panel — scrollable when many guests knock */}
        {isHost && lobbyPending.length > 0 ? (
          <div className="pointer-events-auto absolute bottom-24 left-1/2 z-40 w-[min(92vw,26rem)] -translate-x-1/2 rounded-2xl border border-white/15 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-md sm:bottom-28">
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <p className="text-xs font-bold uppercase tracking-wide text-orange-300">
                Waiting to join · {lobbyPending.length}
              </p>
              <p className="text-[11px] text-white/45">Scroll for more</p>
            </div>
            <div className="max-h-[min(40vh,18rem)] space-y-2 overflow-y-auto overscroll-contain pr-1">
              {lobbyPending.map((guest) => (
                <div
                  key={guest.userId}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{guest.userName}</p>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold text-white/90 hover:bg-white/10"
                    onClick={() => denyLobbyGuest(guest.userId)}
                  >
                    Deny
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                    onClick={() => admitLobbyGuest(guest.userId)}
                  >
                    Admit
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Media Permissions Modal */}
        <MediaPermissionsModal
          isOpen={showMediaPermissions}
          permissions={permissions}
          onRequestPermissions={handleMediaPermissionRequest}
          onClose={() => {
            // Dialog dismiss / backdrop: only close once media is actually ready.
            // "Continue to Meeting" uses onRetry so granted-but-no-stream can't soft-lock.
            if (localStream) setShowMediaPermissions(false);
            else void (async () => {
              unlockBrandAnnouncement();
              const stream = await requestPermissions(true, true);
              if (!stream) return;
              setShowMediaPermissions(false);
              try {
                await initialize({ stream, video: true, audio: true });
                startMeeting();
                announceSpatialRegal();
              } catch {
                setShowMediaPermissions(true);
              }
            })();
          }}
          onRetry={async () => {
            unlockBrandAnnouncement();
            const stream = await requestPermissions(true, true);
            if (stream) {
              setShowMediaPermissions(false);
              try {
                await initialize({ stream, video: true, audio: true });
                startMeeting();
                announceSpatialRegal();
              } catch {
                setShowMediaPermissions(true);
              }
            }
          }}
        />
      </div>
    </div>
    </MeetingReactionsShell>
  );
};