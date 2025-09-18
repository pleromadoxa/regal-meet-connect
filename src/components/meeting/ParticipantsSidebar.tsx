
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Mic, MicOff, Crown, Volume2, VolumeX, MapPin } from 'lucide-react';
import { AudioVisualizer } from '@/components/AudioVisualizer';
import { useAudioVisualizer } from '@/hooks/useAudioVisualizer';

interface RemoteStream {
  id: string;
  stream: MediaStream;
  userName: string;
}

interface ParticipantsSidebarProps {
  localStream: MediaStream | null;
  remoteStreams: RemoteStream[];
  userName: string;
  selectedVideoId: string;
  onVideoSelect: (streamId: string) => void;
  isCurrentUserHost: boolean;
  participants: any[];
  currentUserId: string;
  onToggleMute?: (participantId: string, isMuted: boolean) => void;
}

export const ParticipantsSidebar = ({
  localStream,
  remoteStreams,
  userName,
  selectedVideoId,
  onVideoSelect,
  isCurrentUserHost,
  participants,
  currentUserId,
  onToggleMute
}: ParticipantsSidebarProps) => {
  // Check if participant is host and get location info
  const getParticipantInfo = (participantName: string) => {
    const participant = participants.find(p => p.user_name === participantName);
    return {
      isHost: participant?.is_host || false,
      isMuted: participant?.is_muted || false,
      id: participant?.id || participant?.user_id,
      country: participant?.country,
      city: participant?.city
    };
  };

  // Handle mute toggle
  const handleMuteToggle = (participantName: string, streamId: string) => {
    if (!isCurrentUserHost || !onToggleMute) return;
    
    const participantInfo = getParticipantInfo(participantName);
    
    if (participantInfo.id) {
      onToggleMute(participantInfo.id, !participantInfo.isMuted);
    }
  };

  const ParticipantThumbnail = ({ 
    stream, 
    streamId, 
    participantName, 
    isLocal = false 
  }: {
    stream: MediaStream | null;
    streamId: string;
    participantName: string;
    isLocal?: boolean;
  }) => {
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const currentStreamRef = React.useRef<MediaStream | null>(null);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    
    const participantInfo = isLocal 
      ? { isHost: isCurrentUserHost, isMuted: false, country: undefined, city: undefined }
      : getParticipantInfo(participantName);
    
    const isSelected = selectedVideoId === streamId;
    const hasVideo = stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled;
    const hasAudio = stream && stream.getAudioTracks().length > 0 && stream.getAudioTracks()[0].enabled;
    const isHost = participantInfo.isHost;
    const isMuted = participantInfo.isMuted;
    
    // Audio visualization for this participant's stream
    const audioData = useAudioVisualizer(stream, hasAudio && !isMuted);

    // Debug logging
    React.useEffect(() => {
      if (stream) {
        console.log(`ParticipantThumbnail ${participantName}:`, {
          streamId,
          hasVideo,
          hasAudio,
          videoTracks: stream.getVideoTracks().map(t => ({ enabled: t.enabled, readyState: t.readyState })),
          audioTracks: stream.getAudioTracks().map(t => ({ enabled: t.enabled, readyState: t.readyState })),
          participantInfo,
          audioData: { volume: audioData.volume, isActive: audioData.isActive }
        });
      } else {
        console.log(`ParticipantThumbnail ${participantName}: No stream provided`);
      }
    }, [stream, participantName, hasVideo, hasAudio, audioData.volume, audioData.isActive]);

    // Optimize video stream handling to prevent blinking
    React.useEffect(() => {
      const videoElement = videoRef.current;
      if (!videoElement || !stream) {
        setIsVideoLoaded(false);
        return;
      }

      // Only update srcObject if the stream actually changed
      if (currentStreamRef.current !== stream) {
        currentStreamRef.current = stream;
        videoElement.srcObject = stream;
        setIsVideoLoaded(false);
        
        const handleLoadedMetadata = () => {
          setIsVideoLoaded(true);
        };

        const handleError = () => {
          setIsVideoLoaded(false);
        };

        videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
        videoElement.addEventListener('error', handleError);

        // Play video with proper error handling
        const playVideo = async () => {
          try {
            if (videoElement.readyState >= 2) {
              await videoElement.play();
            }
          } catch (error) {
            // Silently handle autoplay restrictions
            console.warn('Video play failed for participant:', participantName, error);
          }
        };

        // Add delay to prevent race conditions
        const timeoutId = setTimeout(playVideo, 100);

        return () => {
          clearTimeout(timeoutId);
          videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
          videoElement.removeEventListener('error', handleError);
        };
      }
    }, [stream, participantName]);

    return (
      <Card 
        className={`relative overflow-hidden cursor-pointer transition-all duration-300 ${
          isSelected 
            ? 'ring-2 ring-orange-400 bg-orange-500/10 border-orange-400/40' 
            : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-700/60'
        } backdrop-blur-sm`}
        onClick={() => onVideoSelect(streamId)}
      >
        <div className="aspect-video relative min-h-[120px]">
          {hasVideo ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={isLocal}
              preload="metadata"
              webkit-playsinline="true"
              x5-playsinline="true"
              x5-video-player-type="h5"
              x5-video-player-fullscreen="true"
              className={`w-full h-full object-cover rounded-lg transition-opacity duration-200 ${
                isVideoLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ) : null}
          
          {/* Location display - top left corner */}
          {(participantInfo.country || participantInfo.city) && !isLocal && (
            <div className="absolute top-2 left-2 z-20">
              <div className="flex items-center space-x-1 bg-black/70 backdrop-blur-sm rounded-md px-2 py-1">
                <MapPin className="h-3 w-3 text-white/80" />
                <span className="text-white/90 text-xs font-medium">
                  {participantInfo.city && participantInfo.country 
                    ? `${participantInfo.city}, ${participantInfo.country}`
                    : participantInfo.country || participantInfo.city}
                </span>
              </div>
            </div>
          )}
          
          {/* Fallback content - always rendered but controlled by video visibility */}
          <div className={`absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg transition-opacity duration-200 ${
            hasVideo && isVideoLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}>
            <User className="h-8 w-8 text-slate-400" />
          </div>

          {/* Status indicators */}
          <div className="absolute top-2 right-2 flex flex-col space-y-1">
            {/* Host indicator */}
            {isHost && (
              <div className="p-1 bg-yellow-500/80 backdrop-blur-sm rounded-full">
                <Crown className="h-3 w-3 text-white" />
              </div>
            )}
            
            {/* Audio status and mute control */}
            <div className="flex items-center space-x-1">
              {/* Audio visualizer or mute indicator */}
              <div className="p-1 bg-black/50 backdrop-blur-sm rounded-full">
                <AudioVisualizer
                  volume={audioData.volume}
                  isActive={audioData.isActive}
                  avgVolume={audioData.avgVolume}
                  hasAudio={hasAudio && !isMuted}
                  size="sm"
                />
              </div>
              
              {/* Host mute control */}
              {isCurrentUserHost && !isLocal && onToggleMute && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMuteToggle(participantName, streamId);
                  }}
                  variant="ghost"
                  size="sm"
                  className={`h-6 w-6 p-0 ${
                    isMuted 
                      ? 'bg-red-500/80 hover:bg-red-500/60 text-white' 
                      : 'bg-green-500/80 hover:bg-green-500/60 text-white'
                  } backdrop-blur-sm rounded-full`}
                  title={isMuted ? 'Unmute participant' : 'Mute participant'}
                >
                  {isMuted ? (
                    <VolumeX className="h-3 w-3" />
                  ) : (
                    <Volume2 className="h-3 w-3" />
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Name overlay with audio activity */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
            <div className="flex items-center justify-between">
              <p className={`text-white text-sm font-medium truncate ${
                audioData.isActive ? 'text-green-300' : ''
              }`}>
                {participantName}
                {isLocal && " (You)"}
              </p>
              
              {/* Real-time audio level indicator */}
              {audioData.isActive && hasAudio && (
                <div className="flex items-center space-x-1 ml-2">
                  <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-400 font-mono">
                    {audioData.avgVolume}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Selection indicator */}
          {isSelected && (
            <div className="absolute top-2 left-2">
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
            </div>
          )}

          {/* Speaking indicator border */}
          {audioData.isActive && hasAudio && (
            <div className="absolute inset-0 border-2 border-green-400/50 rounded-lg pointer-events-none animate-pulse"></div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="w-80 bg-slate-900/60 backdrop-blur-xl border-l border-slate-700/60 p-4 space-y-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          Participants ({remoteStreams.length + 1})
        </h3>
        {isCurrentUserHost && (
          <Badge variant="outline" className="text-xs bg-yellow-500/20 border-yellow-500/40 text-yellow-400">
            <Crown className="h-3 w-3 mr-1" />
            Host Controls
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {/* Debug info */}
        <div className="text-xs text-slate-400 p-2 bg-slate-800/20 rounded border border-slate-700/30">
          <div>Local: {localStream ? `${localStream.getVideoTracks().length}V/${localStream.getAudioTracks().length}A` : 'None'}</div>
          <div>Remote: {remoteStreams.length} participants</div>
          <div>Selected: {selectedVideoId}</div>
        </div>

        {/* Local user */}
        <ParticipantThumbnail
          stream={localStream}
          streamId="local"
          participantName={userName}
          isLocal={true}
        />

        {/* Remote participants */}
        {remoteStreams.map((remoteStream) => (
          <ParticipantThumbnail
            key={remoteStream.id}
            stream={remoteStream.stream}
            streamId={remoteStream.id}
            participantName={remoteStream.userName}
          />
        ))}
      </div>
      
      {/* Audio legend */}
      <div className="mt-4 p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
        <h4 className="text-sm font-medium text-slate-300 mb-2">Audio Activity</h4>
        <div className="space-y-1 text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Speaking</span>
          </div>
          <div className="flex items-center space-x-2">
            <Mic className="h-3 w-3 text-green-400" />
            <span>Microphone on</span>
          </div>
          <div className="flex items-center space-x-2">
            <MicOff className="h-3 w-3 text-red-400" />
            <span>Muted</span>
          </div>
          {isCurrentUserHost && (
            <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-slate-700/30">
              <Volume2 className="h-3 w-3 text-blue-400" />
              <span>Click to mute/unmute participants</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
