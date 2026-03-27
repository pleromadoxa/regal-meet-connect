import React, { useEffect, useState } from 'react';
import { VideoControls } from '@/components/VideoControls';
import { CaptionsDisplay } from '@/components/CaptionsDisplay';
import { MeetingHeader } from '@/components/meeting/MeetingHeader';
import { ParticipantsList } from '@/components/meeting/ParticipantsList';
import { NetworkQualityIndicator } from '@/components/NetworkQualityIndicator';
import { 
  useMeetingState as useMeetingHooks, 
  useHandRaiseNotifications, 
  useFullscreenHandler,
  useConnectionQuality 
} from '@/components/meeting/MeetingHooks';
import { useMeetingState } from '@/hooks/useMeetingState';
import { useAudioOnlyWebRTC } from '@/hooks/useAudioOnlyWebRTC';
import { useMeetingManagement } from '@/hooks/useMeetingManagement';
import { useCaptions } from '@/hooks/useCaptions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useRecentMeetings } from '@/hooks/useRecentMeetings';
import { usePlatformLogging } from '@/hooks/usePlatformLogging';
import { BackgroundMeetingIndicator } from '@/components/BackgroundMeetingIndicator';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Users, Mic, MicOff, PhoneCall, Volume2 } from 'lucide-react';

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
  onNavigateToDashboard
}: AudioOnlyMeetingProps) => {
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const [sessionId] = useState(() => user?.id || crypto.randomUUID());
  const navigate = useNavigate();
  const [showParticipantsList, setShowParticipantsList] = useState(false);
  const { addRecentMeeting } = useRecentMeetings();
  const { logMeetingLeave, logFeatureUsage } = usePlatformLogging();

  const {
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
    isAudioEnabled,
    currentAudioDevice,
    toggleAudio,
    handleDeviceChange,
    initialize,
    cleanup,
    connectedPeers,
    peerUserNames,
    connectionQuality,
    isOptimizing,
    setQualityOverride,
    speakingParticipants
  } = useAudioOnlyWebRTC(meetingId, userName, sessionId);

  // Meeting state management for synchronization
  const {
    participants: stateParticipants,
    setParticipants: setStateParticipants,
    reactions,
    updateParticipantAudioState,
    sendReaction
  } = useMeetingState(meetingId, sessionId);

  const { 
    participants: dbParticipants, 
    fetchParticipants, 
    toggleMuteParticipant,
    joinMeeting,
    joinAsHost,
    updateParticipantLeaveTime,
    isUserHost
  } = useMeetingManagement();

  const { 
    captions, 
    isEnabled: captionsEnabled, 
    currentTranscript,
    toggleCaptions 
  } = useCaptions(meetingId, currentParticipantId);

  useHandRaiseNotifications(meetingId, userName, setHandNotifications);
  const { toggleFullscreen } = useFullscreenHandler(setIsFullscreen);
  useConnectionQuality(connectedPeers, dbParticipants, setConnectionQuality);

  // Enhanced toggle functions that broadcast state
  const enhancedToggleAudio = async (): Promise<boolean> => {
    const newState = await toggleAudio();
    logFeatureUsage('toggle_audio', sessionId);
    const actualNewState = typeof newState === 'boolean' ? newState : !isAudioEnabled;
    if (currentParticipantId) {
      updateParticipantAudioState(currentParticipantId, actualNewState);
    }
    return actualNewState;
  };

  const enhancedToggleCaptions = () => {
    toggleCaptions();
    logFeatureUsage('toggle_captions', sessionId);
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
        isVideoEnabled: false, // Audio-only mode
        isAudioEnabled: !p.is_muted,
        isHost: p.is_host,
        isMuted: p.is_muted,
        joinedAt: p.joined_at,
        country: p.country,
        city: p.city
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
        timestamp: Date.now(),
        audioOnly: true
      }));
    }
  }, [meetingId, userName, isHost, user?.id]);

  useEffect(() => {
    if (user?.id) {
      initialize();
      
      const joinMeetingDb = async () => {
        try {
          console.log('Joining audio-only meeting:', { meetingId, userName, isHost });
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
              fetchParticipants(meeting.id);
              addRecentMeeting(meetingId, meeting.title, true);
            } else if (!isHost && 'id' in result) {
              participantId = result.id;
              setCurrentParticipantId(participantId);
              
              const { data: meetingData } = await supabase
                .from('meetings')
                .select('*')
                .eq('meeting_id', meetingId)
                .single();
                
              if (meetingData) {
                setCurrentMeeting(meetingData);
                fetchParticipants(meetingData.id);
                addRecentMeeting(meetingId, meetingData.title, false);
              }
            }
            setCurrentParticipantId(participantId);
          }
        } catch (error) {
          console.error('Error joining audio meeting:', error);
          toast({
            title: "Error",
            description: "Failed to join meeting. Please try again.",
            variant: "destructive"
          });
        }
      };
      
      joinMeetingDb();
    }
    return cleanup;
  }, [meetingId, user?.id, isHost]);

  useEffect(() => {
    if (currentMeeting?.id) {
      const interval = setInterval(() => {
        fetchParticipants(currentMeeting.id);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [currentMeeting?.id, fetchParticipants]);

  const copyMeetingId = () => {
    navigator.clipboard.writeText(meetingId);
    logFeatureUsage('copy_meeting_id', user?.id);
    toast({
      title: "Meeting ID Copied",
      description: "Share this ID with others to join the audio meeting"
    });
  };

  const copyMeetingLink = () => {
    logFeatureUsage('copy_meeting_link', user?.id);
    const link = `${window.location.origin}/?join=${meetingId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Meeting Link Copied",
      description: "Share this link with others to join the meeting directly"
    });
  };

  const handleLeaveMeeting = () => {
    logMeetingLeave(meetingId, user?.id);
    if (currentParticipantId) {
      updateParticipantLeaveTime(currentParticipantId);
    }
    localStorage.removeItem('currentMeeting');
    cleanup();
    onLeaveMeeting();
  };

  const handleSignOut = async () => {
    try {
      localStorage.removeItem('currentMeeting');
      localStorage.removeItem('recentMeetings');
      cleanup();
      await signOut();
    } catch (error) {
      console.error('Error during meeting sign out:', error);
      window.location.href = '/';
    }
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
          showParticipants={showParticipantsList}
          isVideoMode={false}
          onCopyMeetingId={copyMeetingId}
          onCopyMeetingLink={copyMeetingLink}
          onToggleFullscreen={toggleFullscreen}
          onToggleParticipants={handleToggleParticipantsList}
          onToggleVideoMode={() => {}}
          onNavigateToSettings={navigateToSettings}
          onSignOut={handleSignOut}
        />

        {/* Audio-Only Meeting Interface */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="max-w-4xl w-full">
            {/* Meeting Info Card */}
            <div className="glass-morphism rounded-xl p-8 mb-8 text-center">
              <div className="flex items-center justify-center mb-4">
                <PhoneCall className="w-12 h-12 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                {currentMeeting?.title || 'Audio Meeting'}
              </h1>
              <p className="text-white/70 mb-6">
                {currentMeeting?.description || 'Audio-only conference call'}
              </p>
              
              {/* Participant Count */}
              <div className="flex items-center justify-center gap-2 text-white/80">
                <Users className="w-5 h-5" />
                <span>{totalParticipantCount} participant{totalParticipantCount !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Speaking Indicators */}
            {speakingParticipants.size > 0 && (
              <div className="glass-morphism rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <Volume2 className="w-5 h-5 text-green-400" />
                  <h3 className="text-lg font-semibold text-white">Currently Speaking</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Array.from(speakingParticipants).map((participantId) => {
                    const stateParticipant = stateParticipants.find(p => p.userId === participantId);
                    const dbParticipant = dbParticipants.find(p => p.user_id === participantId);
                    const displayName = stateParticipant?.userName || dbParticipant?.user_name || 
                                       peerUserNames?.get(participantId) || 'Unknown';
                    
                    return (
                      <div key={participantId} className="flex items-center gap-3 bg-green-500/20 rounded-lg p-3">
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-white font-medium">{displayName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All Participants Grid */}
            <div className="glass-morphism rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">All Participants</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                {/* Current User */}
                <div className="flex items-center gap-3 bg-white/10 rounded-lg p-3">
                  {isAudioEnabled ? (
                    <Mic className="w-4 h-4 text-green-400" />
                  ) : (
                    <MicOff className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-white font-medium">{userName} (You)</span>
                  {isCurrentUserHost && (
                    <span className="text-xs bg-primary px-2 py-1 rounded text-white">HOST</span>
                  )}
                </div>

                {/* Other Participants */}
                {stateParticipants
                  .filter(p => p.userId !== user?.id)
                  .map((participant) => (
                    <div key={participant.id} className="flex items-center gap-3 bg-white/5 rounded-lg p-3">
                      {!participant.isMuted ? (
                        <Mic className="w-4 h-4 text-green-400" />
                      ) : (
                        <MicOff className="w-4 h-4 text-red-400" />
                      )}
                      <span className="text-white font-medium">{participant.userName}</span>
                      {participant.isHost && (
                        <span className="text-xs bg-primary px-2 py-1 rounded text-white">HOST</span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Network Quality Indicator */}
          <div className="absolute top-4 right-4">
            <NetworkQualityIndicator
              connectionQuality={connectionQuality}
              isOptimizing={isOptimizing}
              onQualityOverride={setQualityOverride}
            />
          </div>
        </div>

        <CaptionsDisplay
          captions={captions}
          participants={stateParticipants.map(convertToDbParticipant)}
          isVisible={captionsEnabled}
          currentTranscript={currentTranscript}
        />

        {/* Audio Controls - Only show audio, captions, and reactions */}
        <div className="p-4 bg-black/20 backdrop-blur-sm border-t border-white/10">
          <div className="flex justify-center items-center gap-4">
            <button
              onClick={enhancedToggleAudio}
              className={`p-4 rounded-full transition-all duration-200 ${
                isAudioEnabled
                  ? 'bg-white/10 hover:bg-white/20 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              {isAudioEnabled ? (
                <Mic className="w-6 h-6" />
              ) : (
                <MicOff className="w-6 h-6" />
              )}
            </button>

            <button
              onClick={enhancedToggleCaptions}
              className={`px-4 py-2 rounded-full transition-all duration-200 ${
                captionsEnabled
                  ? 'bg-primary text-white'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              Captions
            </button>

            <button
              onClick={handleLeaveMeeting}
              className="p-4 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all duration-200"
            >
              <PhoneCall className="w-6 h-6 rotate-45" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
