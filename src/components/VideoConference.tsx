import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { VideoControls } from '@/components/VideoControls';
import { ResponsiveParticipantGrid } from '@/components/ResponsiveParticipantGrid';
import { ParticipantsList } from '@/components/ParticipantsList';
import { CaptionsDisplay } from '@/components/CaptionsDisplay';
import { MeetingFeatures } from '@/components/MeetingFeatures';
import { ParticipantReactions } from '@/components/ParticipantReactions';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useMeetingManagement } from '@/hooks/useMeetingManagement';
import { useCaptions } from '@/hooks/useCaptions';
import { useToast } from '@/hooks/use-toast';
import { Crown, Copy, Users, LogOut, Menu, X, Settings, Maximize, Hand } from 'lucide-react';
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
  const [handNotifications, setHandNotifications] = useState<{[key: string]: boolean}>({});

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

  // Listen for hand raise notifications
  useEffect(() => {
    if (!meetingId) return;

    const channel = supabase.channel(`meeting-hands-${meetingId}`);
    
    channel
      .on('broadcast', { event: 'hand-raised' }, (payload) => {
        const { userName: participantName, handRaised, timestamp } = payload.payload;
        
        if (participantName !== userName) {
          setHandNotifications(prev => ({
            ...prev,
            [participantName]: handRaised
          }));

          if (handRaised) {
            toast({
              title: "Hand Raised",
              description: `${participantName} has raised their hand`,
              duration: 5000,
              action: (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setHandNotifications(prev => ({
                      ...prev,
                      [participantName]: false
                    }));
                  }}
                  className="ml-2"
                >
                  Dismiss
                </Button>
              )
            });
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId, userName, toast]);

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

  const handleSendReaction = (type: string) => {
    console.log('Sending reaction:', type);
    
    const channel = supabase.channel(`meeting-reactions-${meetingId}`);
    
    channel.send({
      type: 'broadcast',
      event: 'reaction',
      payload: {
        type,
        participantId: currentParticipantId,
        participantName: userName,
        timestamp: Date.now()
      }
    });
    
    window.dispatchEvent(new CustomEvent('remote-reaction', { 
      detail: { type, participantId: currentParticipantId, participantName: userName } 
    }));
  };

  useEffect(() => {
    const checkConnection = () => {
      // Check if browser is online
      if (!navigator.onLine) {
        setConnectionQuality('offline');
        return;
      }

      // Check WebRTC connection status
      const totalExpectedPeers = participants.length > 0 ? participants.length - 1 : 0;
      const connectedPeerCount = connectedPeers.length;
      
      console.log('Connection check:', { 
        totalExpectedPeers, 
        connectedPeerCount, 
        participantsLength: participants.length,
        isOnline: navigator.onLine 
      });

      if (totalExpectedPeers === 0) {
        // Only user in meeting or no participants data yet
        setConnectionQuality('good');
      } else if (connectedPeerCount === totalExpectedPeers) {
        // All expected peers connected
        setConnectionQuality('good');
      } else if (connectedPeerCount > 0) {
        // Some peers connected but not all
        setConnectionQuality('poor');
      } else {
        // No peers connected but there should be
        setConnectionQuality('poor');
      }
    };

    // Initial check
    checkConnection();

    // Check connection every 3 seconds
    const interval = setInterval(checkConnection, 3000);

    // Listen for online/offline events
    const handleOnline = () => {
      console.log('Browser back online');
      setConnectionQuality('good');
    };
    
    const handleOffline = () => {
      console.log('Browser went offline');
      setConnectionQuality('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connectedPeers.length, participants.length]);

  const isCurrentUserHost = isHost || (currentMeeting && isUserHost(currentMeeting));
  const totalParticipantCount = connectedPeers.length + 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-20 h-20 bg-orange-400 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-20 w-32 h-32 bg-blue-500 rounded-full blur-2xl"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-purple-500 rounded-full blur-lg"></div>
      </div>

      <div className="relative z-10 flex flex-col h-screen">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 bg-black/20 backdrop-blur-xl border-b border-white/10">
          <div className="flex items-center space-x-3 mb-4 sm:mb-0">
            <div className="p-2 bg-gradient-to-r from-orange-400 to-orange-600 rounded-xl shadow-lg">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">
                Regal Meetings
                {isCurrentUserHost && (
                  <span className="inline-flex items-center ml-2 px-2 py-1 bg-yellow-500/20 border border-yellow-400/40 rounded-full text-yellow-300 text-xs font-medium">
                    <Crown className="h-3 w-3 mr-1" />
                    HOST
                  </span>
                )}
              </h1>
              <p className="text-blue-200 font-medium text-sm">ID: {meetingId}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button
              onClick={copyMeetingId}
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:border-white/50 backdrop-blur-sm"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy ID
            </Button>
            
            <div className="flex items-center space-x-2 bg-white/10 px-3 py-2 rounded-lg backdrop-blur-sm border border-white/20">
              <Users className="h-4 w-4 text-white" />
              <span className="text-white font-medium">{totalParticipantCount}</span>
            </div>

            {/* Hand Raised Notifications */}
            {Object.entries(handNotifications).some(([_, raised]) => raised) && (
              <div className="flex items-center space-x-2 bg-yellow-500/20 px-3 py-2 rounded-lg backdrop-blur-sm border border-yellow-400/40">
                <Hand className="h-4 w-4 text-yellow-300 animate-bounce" />
                <span className="text-yellow-300 font-medium text-sm">
                  {Object.entries(handNotifications).filter(([_, raised]) => raised).length} hand(s) raised
                </span>
              </div>
            )}

            <Button
              onClick={toggleFullscreen}
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:border-white/50 backdrop-blur-sm"
            >
              <Maximize className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Fullscreen</span>
            </Button>

            <Button
              onClick={() => setShowParticipants(!showParticipants)}
              variant="outline"
              size="sm"
              className="lg:hidden bg-white/10 border-white/30 text-white hover:bg-white/20 hover:border-white/50 backdrop-blur-sm"
            >
              {showParticipants ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>

            <Button
              onClick={navigateToSettings}
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:border-white/50 backdrop-blur-sm"
            >
              <Settings className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Settings</span>
            </Button>

            <Button
              onClick={handleSignOut}
              variant="outline"
              size="sm"
              className="bg-red-500/20 border-red-400/40 text-white hover:bg-red-500/30 hover:border-red-400/60 backdrop-blur-sm"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>

        <MeetingFeatures
          participantCount={totalParticipantCount}
          isHost={isCurrentUserHost}
          meetingStartTime={meetingStartTime}
          connectionQuality={connectionQuality}
        />

        <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
          <div className="flex-1 min-w-0 relative">
            <ResponsiveParticipantGrid
              localStream={localStream}
              remoteStreams={remoteStreams}
              userName={userName}
              isVideoEnabled={isVideoEnabled}
              selectedVideoId={selectedVideoId}
              onVideoSelect={handleVideoSelect}
            />
          </div>

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

        <CaptionsDisplay
          captions={captions}
          participants={participants}
          isVisible={captionsEnabled}
          currentTranscript={currentTranscript}
        />

        <ParticipantReactions
          participants={participants}
          onSendReaction={handleSendReaction}
        />

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
      </div>
    </div>
  );
};
