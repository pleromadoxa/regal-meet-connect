
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
    toggleVideo,
    toggleAudio,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-orange-400 to-orange-600 rounded-lg shadow-lg">
            <Crown className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white drop-shadow-lg">Regal Meet</h1>
            <p className="text-blue-200 font-medium">Meeting: {meetingId}</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Button
            onClick={copyMeetingId}
            variant="outline"
            className="bg-white/20 border-white/40 text-white hover:bg-white/30 hover:border-white/60 shadow-lg backdrop-blur-sm transition-all duration-200"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy ID
          </Button>
          
          <div className="flex items-center space-x-2 bg-white/20 px-3 py-2 rounded-lg backdrop-blur-sm border border-white/30">
            <Users className="h-5 w-5 text-white" />
            <span className="text-white font-medium">{connectedPeers.length + 1}</span>
          </div>

          <Button
            onClick={handleSignOut}
            variant="outline"
            className="bg-red-500/20 border-red-400/40 text-white hover:bg-red-500/30 hover:border-red-400/60 shadow-lg backdrop-blur-sm transition-all duration-200"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 mb-20">
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
        onToggleVideo={toggleVideo}
        onToggleAudio={toggleAudio}
        onToggleScreenShare={toggleScreenShare}
        onLeaveMeeting={handleLeaveMeeting}
      />
    </div>
  );
};
