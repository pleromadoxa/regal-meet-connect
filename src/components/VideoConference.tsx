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
import { useMediaPermissions } from '@/hooks/useMediaPermissions';
import { supabase } from '@/integrations/supabase/client';

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
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedVideoId, setSelectedVideoId] = useState('local');
  const [showParticipants, setShowParticipants] = useState(false);
  const [showMediaPermissions, setShowMediaPermissions] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVideoMode, setIsVideoMode] = useState(true);
  const [handNotifications, setHandNotifications] = useState<any[]>([]);

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
    currentFacingMode,
    currentAudioDevice,
    currentVideoDevice,
    initialize,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    switchCamera,
    cleanup,
    connectedPeers
  } = useWebRTC(meetingId, userName, user?.id || '');

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
  const remoteStreamsArray = Array.from(remoteStreams?.entries() || []).map(([id, stream]) => ({
    id,
    stream,
    userName: dbParticipants.find(p => p.user_id === id)?.user_name || `User ${id.slice(0, 8)}`
  }));

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden">
      <div className="relative z-10 flex flex-col h-screen">
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
          isVideoEnabled={isVideoEnabled}
          selectedVideoId={selectedVideoId}
          onVideoSelect={setSelectedVideoId}
          isCurrentUserHost={isHost}
          participants={dbParticipants}
          showParticipants={showParticipants}
          currentUserId={user?.id || ''}
          onToggleMute={handleToggleMute}
        />

        {/* Connection Quality Indicator */}
        <div className="fixed top-4 left-4 z-40">
          <ConnectionQualityIndicator 
            peerConnections={new Map()} 
          />
        </div>

        {/* Join/Leave Notifications */}
        <ParticipantJoinLeaveNotifications
          participants={dbParticipants}
          currentUserId={user?.id || ''}
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
          onToggleScreenShare={toggleScreenShare}
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
          participants={dbParticipants}
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
          onRetry={() => {
            setShowMediaPermissions(false);
            setTimeout(() => setShowMediaPermissions(true), 100);
          }}
        />
      </div>
    </div>
  );
};