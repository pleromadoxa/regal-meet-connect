import React, { useEffect, useState } from 'react';
import { VideoControls } from '@/components/VideoControls';
import { CaptionsDisplay } from '@/components/CaptionsDisplay';
import { MeetingFeatures } from '@/components/MeetingFeatures';
import { ParticipantReactions } from '@/components/ParticipantReactions';
import { MeetingHeader } from '@/components/meeting/MeetingHeader';
import { NewMeetingLayout } from '@/components/meeting/NewMeetingLayout';
import { ParticipantsList } from '@/components/meeting/ParticipantsList';
import { ReactionsOverlay } from '@/components/meeting/ReactionsOverlay';
import { NetworkQualityIndicator } from '@/components/NetworkQualityIndicator';
import { MediaPermissionsButton } from '@/components/meeting/MediaPermissionsButton';
import { 
  useMeetingState as useMeetingHooks, 
  useHandRaiseNotifications, 
  useFullscreenHandler,
  useConnectionQuality 
} from '@/components/meeting/MeetingHooks';
import { useMeetingState } from '@/hooks/useMeetingState';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useMeetingManagement } from '@/hooks/useMeetingManagement';
import { useCaptions } from '@/hooks/useCaptions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useRecentMeetings } from '@/hooks/useRecentMeetings';
import { useBackgroundMeeting } from '@/hooks/useBackgroundMeeting';
import { usePlatformLogging } from '@/hooks/usePlatformLogging';
import { BackgroundMeetingIndicator } from '@/components/BackgroundMeetingIndicator';
import { useMultiParticipantSpeakingDetection } from '@/hooks/useSpeakingDetection';

import { useNavigate } from 'react-router-dom';
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
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showParticipantsList, setShowParticipantsList] = useState(false);
  const [isVideoMode, setIsVideoMode] = useState(true);
  const { addRecentMeeting } = useRecentMeetings();
  const { logMeetingLeave, logFeatureUsage } = usePlatformLogging();

  const {
    selectedVideoId,
    setSelectedVideoId,
    currentParticipantId,
    setCurrentParticipantId,
    currentMeeting,
    setCurrentMeeting,
    isFullscreen,
    setIsFullscreen,
    meetingStartTime,
    connectionQuality: networkQuality,
    setConnectionQuality,
    handNotifications,
    setHandNotifications
  } = useMeetingHooks(meetingId, userName);

  const {
    localStream,
    remoteStreams,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    currentFacingMode,
    currentAudioDevice,
    currentVideoDevice,
    toggleVideo,
    toggleAudio,
    switchCamera,
    toggleScreenShare,
    handleDeviceChange,
    initialize,
    cleanup,
    connectedPeers,
    peerUserNames,
    connectionQuality,
    isOptimizing,
    setQualityOverride,
    optimizationSettings
  } = useWebRTC(meetingId, userName, user?.id || '');

  // Speaking detection for many participants
  const {
    speakingParticipants,
    addParticipant: addSpeakingParticipant,
    removeParticipant: removeSpeakingParticipant
  } = useMultiParticipantSpeakingDetection();

  // Meeting state management for synchronization
  const {
    participants: stateParticipants,
    setParticipants: setStateParticipants,
    reactions,
    updateParticipantVideoState,
    updateParticipantAudioState,
    sendReaction
  } = useMeetingState(meetingId, user?.id || '');

  const { 
    participants: dbParticipants, 
    fetchParticipants, 
    toggleMuteParticipant,
    joinMeeting,
    joinAsHost,
    updateParticipantLeaveTime,
    isUserHost
  } = useMeetingManagement();

  // Convert Map to RemoteStream array for components
  const remoteStreamsArray = Array.from(remoteStreams.entries()).map(([id, stream]) => ({
    id,
    stream,
    userName: peerUserNames?.get(id) || 
             stateParticipants.find(p => p.userId === id)?.userName || 
             dbParticipants.find(p => p.user_id === id)?.user_name ||
             `User ${id.slice(0, 8)}`
  }));

  const { 
    captions, 
    isEnabled: captionsEnabled, 
    currentTranscript,
    toggleCaptions 
  } = useCaptions(meetingId, currentParticipantId);

  useHandRaiseNotifications(meetingId, userName, setHandNotifications);
  const { toggleFullscreen } = useFullscreenHandler(setIsFullscreen);
  useConnectionQuality(connectedPeers, dbParticipants, setConnectionQuality);

  // Background meeting management
  const {
    isVisible,
    visibilityState,
    isWakeLockActive,
    startMeeting: startBackgroundMeeting,
    endMeeting: endBackgroundMeeting
  } = useBackgroundMeeting({
    onVisibilityChange: (visible) => {
      console.log('Meeting visibility changed:', visible);
      
      if (!visible) {
        // Meeting moved to background - maintain minimal updates
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

  // Enhanced toggle functions that broadcast state and return the new state
  const enhancedToggleVideo = async (): Promise<boolean> => {
    const newState = await toggleVideo();
    // Log video toggle usage
    logFeatureUsage('toggle_video', user?.id);
    const actualNewState = typeof newState === 'boolean' ? newState : !isVideoEnabled;
    if (currentParticipantId) {
      updateParticipantVideoState(currentParticipantId, actualNewState);
    }
    return actualNewState;
  };

  const enhancedToggleAudio = async (): Promise<boolean> => {
    const newState = await toggleAudio();
    // Log audio toggle usage
    logFeatureUsage('toggle_audio', user?.id);
    const actualNewState = typeof newState === 'boolean' ? newState : !isAudioEnabled;
    if (currentParticipantId) {
      updateParticipantAudioState(currentParticipantId, actualNewState);
    }
    return actualNewState;
  };

  const enhancedToggleScreenShare = async () => {
    await toggleScreenShare();
    // Log screen share toggle usage
    logFeatureUsage('toggle_screen_share', user?.id);
  };

  const enhancedToggleCaptions = () => {
    toggleCaptions();
    // Log captions toggle usage
    logFeatureUsage('toggle_captions', user?.id);
  };

  // Convert ParticipantState to database participant format
  const convertToDbParticipant = (participant: any) => ({
    id: participant.id,
    user_id: participant.userId || participant.user_id,
    user_name: participant.userName || participant.user_name,
    is_host: participant.isHost || participant.is_host,
    is_muted: participant.isMuted || participant.is_muted,
    joined_at: participant.joinedAt || participant.joined_at,
    country: participant.country,
    city: participant.city
  });

  // Sync participants from database with state
  useEffect(() => {
    if (dbParticipants.length > 0) {
      setStateParticipants(dbParticipants.map(p => ({
        id: p.id,
        userId: p.user_id,
        userName: p.user_name,
        isVideoEnabled: true, // Default to true, will be updated by broadcasts
        isAudioEnabled: !p.is_muted,
        isHost: p.is_host,
        isMuted: p.is_muted,
        joinedAt: p.joined_at,
        country: p.country,
        city: p.city
      })));
    }
  }, [dbParticipants, setStateParticipants]);

  // Setup speaking detection for all participants - optimize to prevent loops
  React.useEffect(() => {
    if (!user?.id) return;

    // Add local stream for speaking detection
    if (localStream) {
      addSpeakingParticipant(user.id, localStream);
    }

    // Add remote streams for speaking detection
    remoteStreamsArray.forEach((remoteStreamObj) => {
      addSpeakingParticipant(remoteStreamObj.id, remoteStreamObj.stream);
    });

    // Cleanup function
    return () => {
      if (user?.id) {
        removeSpeakingParticipant(user.id);
      }
      remoteStreamsArray.forEach((remoteStreamObj) => {
        removeSpeakingParticipant(remoteStreamObj.id);
      });
    };
  }, [localStream?.id, remoteStreamsArray.map(r => r.id).join(','), user?.id]); // Stable dependencies

  useEffect(() => {
    if (meetingId && userName && user?.id) {
      localStorage.setItem('currentMeeting', JSON.stringify({
        meetingId,
        userName,
        isHost,
        userId: user.id,
        timestamp: Date.now()
      }));
    }
  }, [meetingId, userName, isHost, user?.id]);

  useEffect(() => {
    if (user?.id) {
      initialize();
      
      const joinMeetingDb = async () => {
        try {
          console.log('Joining meeting in VideoConference:', { meetingId, userName, isHost });
          const result = isHost 
            ? await joinAsHost(meetingId, userName)
            : await joinMeeting(meetingId, userName);
          
          console.log('Join meeting result:', result);
            if (result) {
            let participantId: string;
            let meeting: any;
            
            if (isHost && 'participant' in result) {
              participantId = result.participant.id;
              meeting = result.meeting;
              setCurrentMeeting(meeting);
              console.log('Host joined successfully, fetching participants for meeting UUID:', meeting.id);
              fetchParticipants(meeting.id);
              // Track as recent meeting
              addRecentMeeting(meetingId, meeting.title, true);
            } else if (!isHost && 'id' in result) {
              participantId = result.id;
              setCurrentParticipantId(participantId);
              console.log('Participant joined successfully, finding meeting');
              
              const { data: meetingData, error: meetingError } = await supabase
                .from('meetings')
                .select('*')
                .eq('meeting_id', meetingId)
                .single();
               
              console.log('Meeting data fetch:', { meetingData, meetingError });
              if (meetingData) {
                setCurrentMeeting(meetingData);
                console.log('Fetching participants for meeting UUID:', meetingData.id);
                fetchParticipants(meetingData.id);
                // Track as recent meeting
                addRecentMeeting(meetingId, meetingData.title, false);
              } else {
                console.error('Could not find meeting data for meetingId:', meetingId);
              }
            } else {
              console.error('Unexpected result structure:', result);
              setCurrentParticipantId(`temp-${user.id}-${Date.now()}`);
              return;
            }
            
            setCurrentParticipantId(participantId);
            console.log('Meeting join completed, participant ID:', participantId);
          } else {
            console.warn('Failed to join meeting, using fallback participant ID');
            setCurrentParticipantId(`temp-${user.id}-${Date.now()}`);
          }
        } catch (error) {
          console.error('Error joining meeting:', error);
          setCurrentParticipantId(`temp-${user.id}-${Date.now()}`);
          toast({
            title: "Error",
            description: "Failed to join meeting. Please try again.",
            variant: "destructive"
          });
        }
      };
      
      joinMeetingDb();
      
      // Start background meeting management
      startBackgroundMeeting();
    }
    return () => {
      // End background meeting management before cleanup
      endBackgroundMeeting();
      cleanup();
    };
  }, [meetingId, user?.id, isHost]);

  useEffect(() => {
    if (currentMeeting?.id) {
      const interval = setInterval(() => {
        console.log('Auto-refreshing participants');
        fetchParticipants(currentMeeting.id);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [currentMeeting?.id, fetchParticipants]);

  useEffect(() => {
    const handleResize = () => {
      // No longer need to hide participants sidebar on resize
      // since it's always visible on desktop now
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const copyMeetingId = () => {
    navigator.clipboard.writeText(meetingId);
    logFeatureUsage('copy_meeting_id', user?.id);
    toast({
      title: "Meeting ID Copied",
      description: "Share this ID with others to join the meeting"
    });
  };

  const handleLeaveMeeting = () => {
    // Log meeting leave activity
    logMeetingLeave(meetingId, user?.id);
    
    // Update participant leave time before leaving
    if (currentParticipantId) {
      updateParticipantLeaveTime(currentParticipantId);
    }
    
    // End background meeting management
    endBackgroundMeeting();
    
    // Clear meeting session when leaving intentionally
    localStorage.removeItem('currentMeeting');
    cleanup();
    onLeaveMeeting();
  };

  const handleSignOut = async () => {
    try {
      // End background meeting management first
      endBackgroundMeeting();
      
      // Clear meeting session immediately
      localStorage.removeItem('currentMeeting');
      localStorage.removeItem('recentMeetings');
      
      // Cleanup WebRTC connections
      cleanup();
      
      // Sign out using the hook function (which handles navigation)
      await signOut();
    } catch (error) {
      console.error('Error during meeting sign out:', error);
      // Force navigation even if there's an error
      window.location.href = '/';
    }
  };

  const handleVideoSelect = (streamId: string) => {
    setSelectedVideoId(streamId);
  };

  const handleToggleMute = (participantId: string, isMuted: boolean) => {
    if (isHost || (currentMeeting && isUserHost(currentMeeting))) {
      toggleMuteParticipant(participantId, isMuted);
      toast({
        title: isMuted ? "Participant Muted" : "Participant Unmuted",
        description: "Host action applied successfully"
      });
    } else {
      toast({
        title: "Permission Denied",
        description: "Only the host can mute/unmute participants",
        variant: "destructive"
      });
    }
  };

  const navigateToSettings = () => {
    navigate('/settings');
  };

  const handleSendReaction = (type: string) => {
    console.log('Sending reaction:', type);
    sendReaction(type, userName);
  };

  const handleToggleParticipantsList = () => {
    setShowParticipantsList(!showParticipantsList);
  };

  const handleToggleVideoMode = () => {
    const newMode = !isVideoMode;
    setIsVideoMode(newMode);
    
    // Toggle video for the current user
    if (newMode) {
      // Switching to video mode - enable video if it was off
      if (!isVideoEnabled) {
        enhancedToggleVideo();
      }
    } else {
      // Switching to audio-only mode - disable video if it's on
      if (isVideoEnabled) {
        enhancedToggleVideo();
      }
    }
    
    // Show toast notification
    toast({
      title: newMode ? "Switched to Video Mode" : "Switched to Audio-Only Mode",
      description: newMode ? "Video is now enabled for the meeting" : "Meeting is now audio-only",
      duration: 3000,
    });
  };

  const isCurrentUserHost = isHost || (currentMeeting && isUserHost(currentMeeting));
  const totalParticipantCount = connectedPeers.length + 1;

  return (
    <div className="min-h-screen gradient-hero relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-20 h-20 bg-primary rounded-full blur-xl animate-float"></div>
        <div className="absolute bottom-20 right-20 w-32 h-32 bg-blue-500 rounded-full blur-2xl animate-float-delayed"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-purple-500 rounded-full blur-lg animate-float-slow"></div>
      </div>

      <div className="relative z-10 flex flex-col h-screen safe-area-inset-top safe-area-inset-bottom">
        <MeetingHeader
          meetingId={meetingId}
          isCurrentUserHost={isCurrentUserHost}
          totalParticipantCount={totalParticipantCount}
          handNotifications={handNotifications}
          isFullscreen={isFullscreen}
          showParticipants={showParticipantsList}
          isVideoMode={isVideoMode}
          onCopyMeetingId={copyMeetingId}
          onToggleFullscreen={toggleFullscreen}
          onToggleParticipants={handleToggleParticipantsList}
          onToggleVideoMode={handleToggleVideoMode}
          onNavigateToSettings={navigateToSettings}
          onSignOut={handleSignOut}
        />

        <MeetingFeatures
          participantCount={totalParticipantCount}
          isHost={isCurrentUserHost}
          meetingStartTime={meetingStartTime}
          connectionQuality={networkQuality}
          meetingId={meetingId}
        />

        {/* Media Permissions Check - Show if no local stream */}
        {!localStream && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-30">
            <div className="bg-slate-800/90 backdrop-blur-md rounded-lg p-4 border border-slate-700/50">
              <div className="text-center">
                <h3 className="text-white font-medium mb-2">Media Access Required</h3>
                <p className="text-slate-300 text-sm mb-4">Allow camera and microphone access to join the meeting</p>
                <MediaPermissionsButton 
                  onPermissionsGranted={() => {
                    // Re-initialize media after permissions are granted
                    setTimeout(() => initialize(), 500);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="relative flex-1">
          <NewMeetingLayout
            localStream={localStream}
            remoteStreams={remoteStreamsArray}
            userName={userName}
            isVideoEnabled={isVideoEnabled && isVideoMode}
            selectedVideoId={selectedVideoId}
            onVideoSelect={handleVideoSelect}
            isCurrentUserHost={isCurrentUserHost}
            participants={stateParticipants}
            currentUserId={user?.id || ''}
            onToggleMute={handleToggleMute}
            speakingParticipants={speakingParticipants}
            isVideoMode={isVideoMode}
          />

          {/* Network Quality Indicator - Top Right of Video Feed */}
          <div className="absolute top-4 right-4 z-20">
            <NetworkQualityIndicator
              connectionQuality={connectionQuality}
              isOptimizing={isOptimizing}
              onQualityOverride={setQualityOverride}
            />
          </div>
          
          <ReactionsOverlay reactions={reactions} />
        </div>

        <CaptionsDisplay
          captions={captions}
          participants={stateParticipants.map(convertToDbParticipant)}
          isVisible={captionsEnabled}
          currentTranscript={currentTranscript}
        />

        <ParticipantReactions
          participants={stateParticipants.map(convertToDbParticipant)}
          onSendReaction={handleSendReaction}
        />

        <VideoControls
          isVideoEnabled={isVideoEnabled}
          isAudioEnabled={isAudioEnabled}
          isScreenSharing={isScreenSharing}
          currentFacingMode={currentFacingMode as "user" | "environment"}
          currentAudioDevice={currentAudioDevice}
          currentVideoDevice={currentVideoDevice}
          onToggleVideo={enhancedToggleVideo}
          onToggleAudio={enhancedToggleAudio}
          onToggleScreenShare={enhancedToggleScreenShare}
          onSwitchCamera={switchCamera}
          onLeaveMeeting={handleLeaveMeeting}
          onDeviceChange={handleDeviceChange}
          onToggleCaptions={enhancedToggleCaptions}
          captionsEnabled={captionsEnabled}
          userName={userName}
          meetingId={meetingId}
          onNavigateToDashboard={onNavigateToDashboard}
        />
      </div>

      {/* Participants List Modal */}
      {showParticipantsList && (
        <ParticipantsList
          participants={stateParticipants.map(convertToDbParticipant)}
          remoteStreams={remoteStreamsArray}
          localStream={localStream}
          isCurrentUserHost={isCurrentUserHost}
          currentUserId={user?.id || ''}
          userName={userName}
          meetingId={meetingId}
          onClose={() => setShowParticipantsList(false)}
          onToggleMute={handleToggleMute}
          onSelectVideo={handleVideoSelect}
          selectedVideoId={selectedVideoId}
        />
      )}

      {/* Background Meeting Indicator */}
      <BackgroundMeetingIndicator
        isWakeLockActive={isWakeLockActive}
        connectionQuality={
          connectionQuality.level === 'excellent' || connectionQuality.level === 'good' 
            ? 'good' 
            : connectionQuality.level === 'poor' || connectionQuality.level === 'fair'
            ? 'poor'
            : 'offline'
        }
      />

    </div>
  );
};
