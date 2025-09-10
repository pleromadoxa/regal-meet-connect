import React, { useEffect, useState } from 'react';
import { VideoControls } from '@/components/VideoControls';
import { CaptionsDisplay } from '@/components/CaptionsDisplay';
import { MeetingFeatures } from '@/components/MeetingFeatures';
import { ParticipantReactions } from '@/components/ParticipantReactions';
import { MeetingHeader } from '@/components/meeting/MeetingHeader';
import { NewMeetingLayout } from '@/components/meeting/NewMeetingLayout';
import { ParticipantsList } from '@/components/meeting/ParticipantsList';
import { ReactionsOverlay } from '@/components/meeting/ReactionsOverlay';
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

  const {
    selectedVideoId,
    setSelectedVideoId,
    showParticipants,
    setShowParticipants,
    currentParticipantId,
    setCurrentParticipantId,
    currentMeeting,
    setCurrentMeeting,
    isFullscreen,
    setIsFullscreen,
    meetingStartTime,
    connectionQuality,
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
    peerUserNames
  } = useWebRTC(meetingId, userName, user?.id || '');

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

  // Enhanced toggle functions that broadcast state and return the new state
  const enhancedToggleVideo = async (): Promise<boolean> => {
    const newState = await toggleVideo();
    const actualNewState = typeof newState === 'boolean' ? newState : !isVideoEnabled;
    if (currentParticipantId) {
      updateParticipantVideoState(currentParticipantId, actualNewState);
    }
    return actualNewState;
  };

  const enhancedToggleAudio = async (): Promise<boolean> => {
    const newState = await toggleAudio();
    const actualNewState = typeof newState === 'boolean' ? newState : !isAudioEnabled;
    if (currentParticipantId) {
      updateParticipantAudioState(currentParticipantId, actualNewState);
    }
    return actualNewState;
  };

  // Convert ParticipantState to database participant format
  const convertToDbParticipant = (participant: any) => ({
    id: participant.id,
    user_id: participant.userId || participant.user_id,
    user_name: participant.userName || participant.user_name,
    is_host: participant.isHost || participant.is_host,
    is_muted: participant.isMuted || participant.is_muted,
    joined_at: participant.joinedAt || participant.joined_at
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
        joinedAt: p.joined_at
      })));
    }
  }, [dbParticipants, setStateParticipants]);

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
          
          if (result) {
            let participantId: string;
            let meeting: any;
            
            if (isHost && 'participant' in result) {
              participantId = result.participant.id;
              meeting = result.meeting;
              setCurrentMeeting(meeting);
              console.log('Host joined successfully, fetching participants');
              fetchParticipants(meeting.id);
            } else if (!isHost && 'id' in result) {
              participantId = result.id;
              setCurrentParticipantId(participantId);
              console.log('Participant joined successfully, finding meeting');
              
              const { data: meetingData } = await supabase
                .from('meetings')
                .select('*')
                .eq('meeting_id', meetingId)
                .single();
              
              if (meetingData) {
                setCurrentMeeting(meetingData);
                fetchParticipants(meetingData.id);
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
    }
    return () => cleanup();
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
      if (window.innerWidth >= 1024) {
        setShowParticipants(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const copyMeetingId = () => {
    navigator.clipboard.writeText(meetingId);
    toast({
      title: "Meeting ID Copied",
      description: "Share this ID with others to join the meeting"
    });
  };

  const handleLeaveMeeting = () => {
    localStorage.removeItem('currentMeeting');
    cleanup();
    onLeaveMeeting();
  };

  const handleSignOut = async () => {
    localStorage.removeItem('currentMeeting');
    cleanup();
    await signOut();
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
          showParticipants={showParticipants}
          onCopyMeetingId={copyMeetingId}
          onToggleFullscreen={toggleFullscreen}
          onToggleParticipants={handleToggleParticipantsList}
          onNavigateToSettings={navigateToSettings}
          onSignOut={handleSignOut}
        />

        <MeetingFeatures
          participantCount={totalParticipantCount}
          isHost={isCurrentUserHost}
          meetingStartTime={meetingStartTime}
          connectionQuality={connectionQuality}
        />

        <div className="relative flex-1">
          <NewMeetingLayout
            localStream={localStream}
            remoteStreams={remoteStreamsArray}
            userName={userName}
            isVideoEnabled={isVideoEnabled}
            selectedVideoId={selectedVideoId}
            onVideoSelect={handleVideoSelect}
            isCurrentUserHost={isCurrentUserHost}
            participants={stateParticipants}
            showParticipants={showParticipants}
            currentUserId={user?.id || ''}
            onToggleMute={handleToggleMute}
          />
          
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
          onClose={() => setShowParticipantsList(false)}
          onToggleMute={handleToggleMute}
          onSelectVideo={handleVideoSelect}
          selectedVideoId={selectedVideoId}
        />
      )}
    </div>
  );
};
