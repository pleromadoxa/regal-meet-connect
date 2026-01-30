import React, { useEffect, useState, useCallback } from 'react';
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
import { WaitingRoom } from './meeting/WaitingRoom';
import { useMediaPermissions } from '@/hooks/useMediaPermissions';
import { supabase } from '@/integrations/supabase/client';
import { InMeetingChat } from './InMeetingChat';

interface VideoConferenceProps {
  meetingId: string;
  userName: string;
  isHost?: boolean;
  initialVideoEnabled?: boolean;
  initialAudioEnabled?: boolean;
  onLeaveMeeting: () => void;
  onNavigateToDashboard?: () => void;
}

export const VideoConference = ({ 
  meetingId, 
  userName, 
  isHost = false, 
  initialVideoEnabled = true,
  initialAudioEnabled = true,
  onLeaveMeeting,
  onNavigateToDashboard
}: VideoConferenceProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedVideoId, setSelectedVideoId] = useState('local');
  const [activeSidePanel, setActiveSidePanel] = useState<'chat' | 'participants' | 'settings' | null>(null);
  const [showMediaPermissions, setShowMediaPermissions] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVideoMode, setIsVideoMode] = useState(true);
  const [handNotifications, setHandNotifications] = useState<any[]>([]);

  const showParticipants = activeSidePanel === 'participants';

  const togglePanel = useCallback((panel: 'chat' | 'participants' | 'settings') => {
    setActiveSidePanel(current => current === panel ? null : panel);
  }, []);

  // Media permissions management
  const {
    permissions,
    requestPermissions,
    testMediaAccess,
    isSupported
  } = useMediaPermissions();

  // Real-time participants management
  const { 
    participants: dbParticipants, 
    updateParticipantStatus,
    removeParticipant: removeDbParticipant 
  } = useRealTimeParticipants(meetingId, user?.id || '', userName);

  // WebRTC management
  const {
    localStream,
    remoteStreams,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    isWaiting,
    waitingUsers,
    admitUser,
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
    peerUserNames
  } = useWebRTC(meetingId, userName, user?.id || '', initialVideoEnabled, initialAudioEnabled, isHost);

  // Background meeting management
  const { 
    isVisible,
    startMeeting,
    endMeeting
  } = useBackgroundMeeting({
    onVisibilityChange: (visible) => {
      if (!visible) {
        toast({
          title: "Meeting in Background",
          description: "Meeting will continue running while minimized",
          duration: 3000,
        });
      }
    },
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
  const remoteStreamsArray = Array.from(remoteStreams?.entries() || []).map(([id, stream]) => {
    const participant = dbParticipants.find(p => p.user_id === id);
    const peerUserName = peerUserNames[id];
    return {
      id,
      stream,
      userName: participant?.user_name || peerUserName || 'Guest User'
    };
  });

  // Check media permissions on mount
  useEffect(() => {
    const checkInitialPermissions = async () => {
      if (!isSupported) return;
      
      const hasAccess = await testMediaAccess();
      if (!hasAccess && (permissions.camera === 'denied' || permissions.microphone === 'denied')) {
        setShowMediaPermissions(true);
      }
    };

    checkInitialPermissions();
  }, [isSupported, testMediaAccess, permissions]);

  // Initialize WebRTC on mount
  useEffect(() => {
    if (!user?.id || !meetingId || !userName) return;

    console.log('Initializing VideoConference with:', { meetingId, userName, userId: user.id });
    
    const initializeWithPermissions = async () => {
      if (permissions.camera === 'granted' || permissions.microphone === 'granted') {
        initialize();
        startMeeting();
      } else if (permissions.camera === 'prompt' || permissions.microphone === 'prompt') {
        setShowMediaPermissions(true);
      }
    };

    initializeWithPermissions();

    return () => {
      console.log('Cleaning up WebRTC connections');
      cleanup();
      removeDbParticipant();
      endMeeting();
    };
  }, [meetingId, userName, user?.id, permissions]);

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
      initialize();
      startMeeting();
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
    console.log(`Changing ${type} device to:`, deviceId);
    // Device changes would be handled in the WebRTC hook
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

  const handleToggleVideoMode = () => {
    const newMode = !isVideoMode;
    setIsVideoMode(newMode);
    
    if (newMode && !isVideoEnabled) {
      toggleVideo();
    } else if (!newMode && isVideoEnabled) {
      toggleVideo();
    }
    
    toast({
      title: newMode ? "Switched to Video Mode" : "Switched to Audio-Only Mode",
      description: newMode ? "Video is now enabled" : "Meeting is now audio-only",
      duration: 3000,
    });
  };

  const handleNavigateToSettings = () => {
    // Navigate to settings or show settings modal
    toast({
      title: "Settings",
      description: "Settings panel would open here",
    });
  };

  const handleSignOut = () => {
    handleLeaveMeeting();
  };

  const totalParticipantCount = connectedPeers.length + 1;
  const showBackgroundIndicator = !isVisible && !!localStream;

  if (isWaiting && !isHost) {
    return <WaitingRoom meetingTitle={meetingId} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 relative overflow-hidden flex flex-col">
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
        onToggleParticipants={() => togglePanel('participants')}
        onToggleVideoMode={handleToggleVideoMode}
        onNavigateToSettings={handleNavigateToSettings}
        onSignOut={handleSignOut}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 flex flex-col relative min-w-0">
          {/* Meeting Layout */}
          <MeetingLayout
            localStream={localStream}
            remoteStreams={remoteStreamsArray}
            userName={userName}
            isVideoEnabled={isVideoEnabled}
            selectedVideoId={selectedVideoId}
            onVideoSelect={setSelectedVideoId}
            isCurrentUserHost={isHost}
            participants={dbParticipants}
            showParticipants={showParticipants}
            currentUserId={user?.id || ''}
            onToggleMute={handleToggleMute}
            waitingUsers={waitingUsers}
            onAdmitUser={admitUser}
          />

          {/* Connection Quality Indicator */}
          <div className="absolute top-4 left-4 z-40">
            <ConnectionQualityIndicator
              peerConnections={new Map()}
            />
          </div>

          {/* Join/Leave Notifications */}
          <ParticipantJoinLeaveNotifications
            participants={dbParticipants}
            currentUserId={user?.id || ''}
          />

          {/* Captions Display */}
          <CaptionsDisplay
            captions={captions}
            participants={dbParticipants}
            isVisible={captionsEnabled}
          />
        </div>

        {/* Chat Side Panel */}
        {activeSidePanel === 'chat' && (
          <div className="w-80 h-full border-l border-white/10 bg-slate-900 z-20 shrink-0">
            <InMeetingChat
              userName={userName}
              onClose={() => setActiveSidePanel(null)}
            />
          </div>
        )}
      </div>

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
        onToggleScreenShare={toggleScreenShare}
        onSwitchCamera={switchCamera}
        onLeaveMeeting={handleLeaveMeeting}
        onDeviceChange={handleDeviceChange}
        onToggleCaptions={toggleCaptions}
        captionsEnabled={captionsEnabled}
        userName={userName}
        meetingId={meetingId}
        onNavigateToDashboard={onNavigateToDashboard}
        showChat={activeSidePanel === 'chat'}
        onToggleChat={() => togglePanel('chat')}
        onToggleParticipants={() => togglePanel('participants')}
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
        onRetry={() => {
          setShowMediaPermissions(false);
          setTimeout(() => setShowMediaPermissions(true), 100);
        }}
      />
    </div>
  );
};