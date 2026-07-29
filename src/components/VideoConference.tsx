import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebRTC } from '@/hooks/useWebRTC';
import { MeetingHeader } from './meeting/MeetingHeader';
import { MeetingLayout } from './meeting/MeetingLayout';
import { VideoControls } from './VideoControls';
import { CaptionsDisplay } from './CaptionsDisplay';
import { useCaptions } from '@/hooks/useCaptions';
import { BackgroundMeetingIndicator } from './BackgroundMeetingIndicator';
import { useBackgroundMeeting } from '@/hooks/useBackgroundMeeting';
import { useRealTimeParticipants } from '@/hooks/useRealTimeParticipants';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ParticipantJoinLeaveNotifications } from './meeting/ParticipantJoinLeaveNotifications';
import { ConnectionQualityIndicator } from './meeting/ConnectionQualityIndicator';
import { MediaPermissionsModal } from './meeting/MediaPermissionsModal';
import { useMediaPermissions } from '@/hooks/useMediaPermissions';
import { useLobbyHost } from '@/hooks/useLobbyHost';
import { useMeetingPresentation } from '@/hooks/useMeetingPresentation';
import { useMeetingTopology } from '@/hooks/useMeetingTopology';
import { useMeetingPlanContext } from '@/hooks/useMeetingPlanContext';
import { useMeetingDurationLimit } from '@/hooks/useMeetingPlanEnforcement';
import { useCloudflareSfu } from '@/hooks/useCloudflareSfu';
import { LargeMeetingBanner } from '@/components/meeting/LargeMeetingBanner';
import { MeetingConnectingShell } from '@/components/meeting/MeetingConnectingShell';
import type { MeetingMediaRoutingOptions } from '@/lib/meetingTopology';
import { supabase } from '@/integrations/supabase/client';
import { resolveParticipantDisplayName, enrichParticipantNames } from '@/lib/participantNames';

interface VideoConferenceProps {
  meetingId: string;
  userName: string;
  isHost?: boolean;
  onLeaveMeeting: () => void;
  onNavigateToDashboard?: () => void;
}

export const VideoConference = ({ 
  meetingId, 
  userName, 
  isHost = false, 
  onLeaveMeeting,
  onNavigateToDashboard
}: VideoConferenceProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedVideoId, setSelectedVideoId] = useState('local');
  const [showParticipants, setShowParticipants] = useState(false);
  const [showMediaPermissions, setShowMediaPermissions] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVideoMode, setIsVideoMode] = useState(true);
  const [handNotifications, setHandNotifications] = useState<any[]>([]);

  // Listen for guest "knock" requests when this user is the host
  useLobbyHost(meetingId, isHost);

  // Media permissions management
  const {
    permissions,
    requestPermissions,
    isSupported
  } = useMediaPermissions();

  // Real-time participants management
  const { 
    participants: dbParticipants,
    meetingHostId: meetingHostIdFromLookup,
    updateParticipantStatus,
    removeParticipant: removeDbParticipant 
  } = useRealTimeParticipants(meetingId, user?.id || '', userName, isHost);

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
    handleDeviceChange: switchMediaDevice,
    setPlanLimits,
  } = useWebRTC(meetingId, userName, user?.id || '', mediaRouting);

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

  const effectivePresentation = presentationActive || isScreenSharing;

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

  // Convert Map to RemoteStream array for components
  const remoteStreamsArray = Array.from(remoteStreams?.entries() || []).map(([id, stream]) => ({
    id,
    stream,
    userName: resolveParticipantDisplayName(id, participantsForUi, peerUserNames),
  }));

  // Initialize WebRTC — call getUserMedia directly; the browser shows its own permission prompt
  useEffect(() => {
    if (!user?.id || !meetingId || !userName) return;
    if (localStream) return;

    if (!isSupported) {
      setShowMediaPermissions(true);
      return;
    }

    if (permissions.camera === 'denied' && permissions.microphone === 'denied') {
      setShowMediaPermissions(true);
      return;
    }

    let cancelled = false;

    const startMedia = async () => {
      if (cancelled) return;
      try {
        await initialize();
        if (!cancelled) startMeeting();
      } catch {
        if (!cancelled) setShowMediaPermissions(true);
      }
    };

    const delay =
      permissions.camera === 'checking' || permissions.microphone === 'checking' ? 600 : 0;
    const timer = window.setTimeout(() => {
      void startMedia();
    }, delay);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    meetingId,
    userName,
    user?.id,
    isSupported,
    permissions.camera,
    permissions.microphone,
    localStream,
    initialize,
    startMeeting,
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
    const stream = await requestPermissions(video, audio);
    if (stream) {
      setShowMediaPermissions(false);
      try {
        await initialize({ stream, video, audio });
        startMeeting();
      } catch {
        setShowMediaPermissions(true);
      }
    }
  };

  const handleToggleMute = (participantId: string, isMuted: boolean) => {
    if (!isHost) {
      toast({
        title: "Permission Denied",
        description: "Only the host can mute/unmute participants",
        variant: "destructive"
      });
      return;
    }

    // Broadcast mute command through Supabase channel
    const channel = supabase.channel(`meeting-mute-${participantId}`);
    
    channel.send({
      type: 'broadcast',
      event: 'mute-toggle',
      payload: {
        participantId,
        isMuted,
        fromHost: true
      }
    });

    toast({
      title: isMuted ? "Participant Muted" : "Participant Unmuted",
      description: "Host action applied successfully"
    });
  };

  const copyMeetingId = () => {
    navigator.clipboard.writeText(meetingId);
    toast({
      title: "Meeting ID Copied",
      description: "Share this ID with others to join the meeting"
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
    } else if (isVideoEnabled) {
      await toggleVideo();
    }
  };

  return (
    <div className="min-h-screen bg-[#202124] relative overflow-hidden">
      <div className="relative z-10 flex flex-col h-screen">
        <LargeMeetingBanner
          mediaMode={topology.mediaMode}
          mediaRole={topology.mediaRole}
          participantCount={totalParticipantCount}
          sfuAvailable={topology.sfuAvailable}
        />
        {/* Meeting Header */}
        <MeetingHeader
          meetingId={meetingId}
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
        />

        {/* Meeting Layout */}
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
        />

        {showConnectingShell && (
          <MeetingConnectingShell
            message="Setting up camera and microphone…"
            subMessage="Allow access when prompted, or use the permissions dialog."
          />
        )}

        {/* Connection Quality Indicator */}
        <div className="fixed top-4 left-4 z-40 hidden sm:block">
          <ConnectionQualityIndicator peerConnections={peerConnections} />
        </div>

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
          meetingId={meetingId}
          onNavigateToDashboard={onNavigateToDashboard}
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

        {/* Media Permissions Modal */}
        <MediaPermissionsModal
          isOpen={showMediaPermissions}
          permissions={permissions}
          onRequestPermissions={handleMediaPermissionRequest}
          onClose={() => setShowMediaPermissions(false)}
          onRetry={async () => {
            const stream = await requestPermissions(true, true);
            if (stream) {
              setShowMediaPermissions(false);
              try {
                await initialize({ stream, video: true, audio: true });
                startMeeting();
              } catch {
                setShowMediaPermissions(true);
              }
            }
          }}
        />
      </div>
    </div>
  );
};