
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
import { Crown, Copy, Users, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface VideoConferenceProps {
  meetingId: string;
  userName: string;
  isHost?: boolean;
  onLeaveMeeting: () => void;
}

export const VideoConference = ({ 
  meetingId, 
  userName, 
  isHost = false, 
  onLeaveMeeting 
}: VideoConferenceProps) => {
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const [selectedVideoId, setSelectedVideoId] = useState<string>('local');
  const [showParticipants, setShowParticipants] = useState(false);
  const [currentParticipantId, setCurrentParticipantId] = useState<string>('');

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
    joinAsHost
  } = useMeetingManagement();

  const { 
    captions, 
    isEnabled: captionsEnabled, 
    toggleCaptions 
  } = useCaptions(meetingId, currentParticipantId);

  useEffect(() => {
    if (user?.id) {
      initialize();
      
      // Join meeting in database
      const joinMeetingDb = async () => {
        const result = isHost 
          ? await joinAsHost(meetingId, userName)
          : await joinMeeting(meetingId, userName);
        
        if (result) {
          let participantId: string;
          
          if (isHost && 'participant' in result) {
            participantId = result.participant.id;
            // Fetch participants for this meeting
            fetchParticipants(result.meeting.id);
          } else if (!isHost && 'id' in result) {
            participantId = result.id;
          } else {
            console.error('Unexpected result structure:', result);
            return;
          }
          
          setCurrentParticipantId(participantId);
        }
      };
      
      joinMeetingDb();
    }
    return () => cleanup();
  }, [meetingId, user?.id, isHost]);

  // Auto-hide participants panel on mobile
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
    if (isHost) {
      toggleMuteParticipant(participantId, isMuted);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-2 sm:p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-orange-400 to-orange-600 rounded-lg shadow-lg">
            <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">
              Regal Meet
              {isHost && <span className="text-yellow-300 ml-2 text-sm">(Host)</span>}
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

          {/* Participants Toggle - Mobile */}
          <Button
            onClick={() => setShowParticipants(!showParticipants)}
            variant="outline"
            size="sm"
            className="lg:hidden bg-white/20 border-white/40 text-white hover:bg-white/30 hover:border-white/60 shadow-lg backdrop-blur-sm transition-all duration-200"
          >
            {showParticipants ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
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

      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-120px)]">
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
            isHost={isHost}
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
      />
    </div>
  );
};
