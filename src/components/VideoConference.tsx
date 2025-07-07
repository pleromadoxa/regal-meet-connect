
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { VideoControls } from '@/components/VideoControls';
import { ParticipantGrid } from '@/components/ParticipantGrid';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useToast } from '@/hooks/use-toast';
import { Crown, Copy, Users, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface VideoConferenceProps {
  meetingId: string;
  userName: string;
  onLeaveMeeting: () => void;
}

export const VideoConference = ({ meetingId, userName, onLeaveMeeting }: VideoConferenceProps) => {
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const {
    localStream,
    remoteStreams,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    currentFacingMode,
    toggleVideo,
    toggleAudio,
    switchCamera,
    toggleScreenShare,
    initialize,
    cleanup,
    connectedPeers
  } = useWebRTC(meetingId, userName, user?.id || '');

  useEffect(() => {
    if (user?.id) {
      initialize();
    }
    return () => cleanup();
  }, [meetingId, user?.id]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-2 sm:p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-orange-400 to-orange-600 rounded-lg shadow-lg">
            <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">Regal Meet</h1>
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

      {/* Video Grid */}
      <div className="flex-1 mb-20 sm:mb-24">
        <ParticipantGrid
          localStream={localStream}
          remoteStreams={remoteStreams}
          userName={userName}
          isVideoEnabled={isVideoEnabled}
        />
      </div>

      {/* Controls */}
      <VideoControls
        isVideoEnabled={isVideoEnabled}
        isAudioEnabled={isAudioEnabled}
        isScreenSharing={isScreenSharing}
        currentFacingMode={currentFacingMode}
        onToggleVideo={toggleVideo}
        onToggleAudio={toggleAudio}
        onToggleScreenShare={toggleScreenShare}
        onSwitchCamera={switchCamera}
        onLeaveMeeting={handleLeaveMeeting}
      />
    </div>
  );
};
