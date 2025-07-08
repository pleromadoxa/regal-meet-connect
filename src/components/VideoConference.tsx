import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { VideoControls } from '@/components/VideoControls';
import { ParticipantGrid } from '@/components/ParticipantGrid';
import { ParticipantsList } from '@/components/ParticipantsList';
import { CaptionsDisplay } from '@/components/CaptionsDisplay';
import { MeetingFeatures } from '@/components/MeetingFeatures';
import { ParticipantReactions } from '@/components/ParticipantReactions';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useMeetingManagement } from '@/hooks/useMeetingManagement';
import { useCaptions } from '@/hooks/useCaptions';
import { useToast } from '@/hooks/use-toast';
import { Crown, Copy, Users, LogOut, Menu, X, Settings, Maximize } from 'lucide-react';
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
  const [selectedVideoId, setSelectedVideoId] = useState<string>('local');
  const [showParticipants, setShowParticipants] = useState(false);
  const [currentParticipantId, setCurrentParticipantId] = useState<string>('');
  const [currentMeeting, setCurrentMeeting] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [meetingStartTime] = useState(new Date());
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>('good');

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
    connectedPeers
  } = useWebRTC(meetingId, userName, user?.id || '');

  const { 
    participants, 
    fetchParticipants, 
    toggleMuteParticipant,
    joinMeeting,
    joinAsHost,
    isUserHost
  } = useMeetingManagement();

  const { 
    captions, 
    isEnabled: captionsEnabled, 
    currentTranscript,
    toggleCaptions 
  } = useCaptions(meetingId, currentParticipantId);

  // Store meeting state in localStorage for session persistence
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
          console.log('Joining meeting:', { meetingId, userName, isHost });
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
              // For non-host participants, we need to find the meeting
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
        }
      };
      
      joinMeetingDb();
    }
    return () => cleanup();
  }, [meetingId, user?.id, isHost]);

  // Auto-refresh participants every 5 seconds to ensure visibility
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

  // Fullscreen functionality
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
      toast({
        title: "Fullscreen Error",
        description: "Unable to toggle fullscreen mode",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
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

  // Monitor connection quality
  useEffect(() => {
    const checkConnection = () => {
      if (navigator.onLine) {
        // Simple connection quality check based on connected peers
        if (connectedPeers.length === participants.length - 1) {
          setConnectionQuality('good');
        } else if (connectedPeers.length > 0) {
          setConnectionQuality('poor');
        } else {
          setConnectionQuality('offline');
        }
      } else {
        setConnectionQuality('offline');
      }
    };

    const interval = setInterval(checkConnection, 5000);
    checkConnection();

    return () => clearInterval(interval);
  }, [connectedPeers.length, participants.length]);

  const isCurrentUserHost = isHost || (currentMeeting && isUserHost(currentMeeting));
  const totalParticipantCount = connectedPeers.length + 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-2 sm:p-4 pb-28 sm:pb-32 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-orange-400 to-orange-600 rounded-lg shadow-lg">
            <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">
              Regal Meet
              {isCurrentUserHost && (
                <span className="inline-flex items-center ml-2 px-2 py-1 bg-yellow-500/20 border border-yellow-400/40 rounded-full text-yellow-300 text-xs font-medium">
                  <Crown className="h-3 w-3 mr-1" />
                  HOST
                </span>
              )}
            </h1>
            <p className="text-blue-200 font-medium text-sm sm:text-base">Meeting: {meetingId}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <Button
            onClick={copyMeetingId}
            variant="outline"
            size="sm"
            className="bg-white/20 border-white/40 text-white hover:bg-white/30 hover:border-white/60 shadow-lg backdrop-blur-sm transition-all duration-200 text-xs sm:text-sm"
          >
            <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Copy ID
          </Button>
          
          <div className="flex items-center space-x-2 bg-white/20 px-2 sm:px-3 py-1 sm:py-2 rounded-lg backdrop-blur-sm border border-white/30">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            <span className="text-white font-medium text-sm sm:text-base">{totalParticipantCount}</span>
          </div>

          <Button
            onClick={toggleFullscreen}
            variant="outline"
            size="sm"
            className="bg-white/20 border-white/40 text-white hover:bg-white/30 hover:border-white/60 shadow-lg backdrop-blur-sm transition-all duration-200 text-xs sm:text-sm"
          >
            <Maximize className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Fullscreen</span>
          </Button>

          <Button
            onClick={() => setShowParticipants(!showParticipants)}
            variant="outline"
            size="sm"
            className="lg:hidden bg-white/20 border-white/40 text-white hover:bg-white/30 hover:border-white/60 shadow-lg backdrop-blur-sm transition-all duration-200"
          >
            {showParticipants ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>

          <Button
            onClick={navigateToSettings}
            variant="outline"
            size="sm"
            className="bg-white/20 border-white/40 text-white hover:bg-white/30 hover:border-white/60 shadow-lg backdrop-blur-sm transition-all duration-200 text-xs sm:text-sm"
          >
            <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Settings</span>
          </Button>

          <Button
            onClick={handleSignOut}
            variant="outline"
            size="sm"
            className="bg-red-500/20 border-red-400/40 text-white hover:bg-red-500/30 hover:border-red-400/60 shadow-lg backdrop-blur-sm transition-all duration-200 text-xs sm:text-sm"
          >
            <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </div>

      {/* Meeting Features */}
      <MeetingFeatures
        participantCount={totalParticipantCount}
        isHost={isCurrentUserHost}
        meetingStartTime={meetingStartTime}
        connectionQuality={connectionQuality}
      />

      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-220px)] sm:h-[calc(100vh-240px)]">
        {/* Video Area */}
        <div className="flex-1 min-w-0 relative">
          <ParticipantGrid
            localStream={localStream}
            remoteStreams={remoteStreams}
            userName={userName}
            isVideoEnabled={isVideoEnabled}
            selectedVideoId={selectedVideoId}
            onVideoSelect={handleVideoSelect}
          />
        </div>

        {/* Participants Panel */}
        <div className={`w-full lg:w-80 ${showParticipants ? 'block' : 'hidden lg:block'}`}>
          <ParticipantsList
            participants={participants}
            remoteStreams={remoteStreams}
            localStream={localStream}
            currentUserId={user?.id || ''}
            isHost={isCurrentUserHost}
            onToggleMute={handleToggleMute}
            onSelectVideo={handleVideoSelect}
            selectedVideoId={selectedVideoId}
          />
        </div>
      </div>

      {/* Captions Display */}
      <CaptionsDisplay
        captions={captions}
        participants={participants}
        isVisible={captionsEnabled}
        currentTranscript={currentTranscript}
      />

      {/* Participant Reactions */}
      <ParticipantReactions
        participants={participants}
        onSendReaction={(type) => {
          // Broadcast reaction to other participants
          window.dispatchEvent(new CustomEvent('send-reaction', { 
            detail: { type, participantId: currentParticipantId, participantName: userName } 
          }));
        }}
      />

      {/* Controls */}
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
        onNavigateToDashboard={onNavigateToDashboard}
      />
    </div>
  );
};
