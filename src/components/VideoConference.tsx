
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { VideoControls } from '@/components/VideoControls';
import { ParticipantGrid } from '@/components/ParticipantGrid';
import { ParticipantsList } from '@/components/ParticipantsList';
import { CaptionsDisplay } from '@/components/CaptionsDisplay';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useMeetingManagement } from '@/hooks/useMeetingManagement';
import { useCaptions } from '@/hooks/useCaptions';
import { useToast } from '@/hooks/use-toast';
import { Crown, Copy, Users, LogOut, Menu, X, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

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
    toggleCaptions 
  } = useCaptions(meetingId, currentParticipantId);

  useEffect(() => {
    if (user?.id) {
      initialize();
      
      const joinMeetingDb = async () => {
        const result = isHost 
          ? await joinAsHost(meetingId, userName)
          : await joinMeeting(meetingId, userName);
        
        if (result) {
          let participantId: string;
          let meeting: any;
          
          if (isHost && 'participant' in result) {
            participantId = result.participant.id;
            meeting = result.meeting;
            fetchParticipants(result.meeting.id);
          } else if (!isHost && 'id' in result) {
            participantId = result.id;
          } else {
            console.error('Unexpected result structure:', result);
            return;
          }
          
          setCurrentParticipantId(participantId);
          setCurrentMeeting(meeting);
        }
      };
      
      joinMeetingDb();
    }
    return () => cleanup();
  }, [meetingId, user?.id, isHost]);

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
    cleanup();
    onLeaveMeeting();
  };

  const handleSignOut = async () => {
    cleanup();
    await signOut();
  };

  const handleVideoSelect = (streamId: string) => {
    setSelectedVideoId(streamId);
  };

  const handleToggleMute = (participantId: string, isMuted: boolean) => {
    // Only hosts can mute/unmute other participants
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

  // Check if current user is the actual host
  const isCurrentUserHost = isHost || (currentMeeting && isUserHost(currentMeeting));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-2 sm:p-4 pb-28 sm:pb-32">
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
            <span className="text-white font-medium text-sm sm:text-base">{connectedPeers.length + 1}</span>
          </div>

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

      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-220px)] sm:h-[calc(100vh-240px)]">
        {/* Video Area */}
        <div className="flex-1 min-w-0">
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
