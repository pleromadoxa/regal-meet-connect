
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Video, VideoOff, Crown, User } from 'lucide-react';

interface RemoteStream {
  id: string;
  stream: MediaStream;
  userName: string;
}

interface ResponsiveParticipantGridProps {
  localStream: MediaStream | null;
  remoteStreams: RemoteStream[];
  userName: string;
  isVideoEnabled: boolean;
  selectedVideoId: string;
  onVideoSelect: (streamId: string) => void;
}

export const ResponsiveParticipantGrid = ({
  localStream,
  remoteStreams,
  userName,
  isVideoEnabled,
  selectedVideoId,
  onVideoSelect
}: ResponsiveParticipantGridProps) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const totalParticipants = remoteStreams.length + 1;
  const isMobile = dimensions.width < 768;
  
  // Calculate optimal grid layout
  const getGridLayout = (count: number) => {
    if (isMobile) {
      if (count === 1) return { cols: 1, rows: 1 };
      if (count === 2) return { cols: 1, rows: 2 };
      if (count <= 4) return { cols: 2, rows: 2 };
      if (count <= 6) return { cols: 2, rows: 3 };
      return { cols: 2, rows: Math.ceil(count / 2) };
    } else {
      if (count === 1) return { cols: 1, rows: 1 };
      if (count === 2) return { cols: 2, rows: 1 };
      if (count <= 4) return { cols: 2, rows: 2 };
      if (count <= 6) return { cols: 3, rows: 2 };
      if (count <= 9) return { cols: 3, rows: 3 };
      return { cols: 4, rows: Math.ceil(count / 4) };
    }
  };

  const gridLayout = getGridLayout(totalParticipants);
  
  const gridClasses = isMobile 
    ? `grid gap-2 p-2 h-full`
    : `grid gap-4 p-4 h-full`;

  const gridStyle = {
    gridTemplateColumns: `repeat(${gridLayout.cols}, 1fr)`,
    gridTemplateRows: `repeat(${gridLayout.rows}, 1fr)`
  };

  const VideoCard = ({ 
    stream, 
    streamId, 
    participantName, 
    isLocal = false, 
    isHost = false 
  }: {
    stream: MediaStream | null;
    streamId: string;
    participantName: string;
    isLocal?: boolean;
    isHost?: boolean;
  }) => {
    const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
    const isSelected = selectedVideoId === streamId;
    const hasVideo = stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled;
    const hasAudio = stream && stream.getAudioTracks().length > 0 && stream.getAudioTracks()[0].enabled;

    useEffect(() => {
      if (videoElement && stream) {
        // Prevent video glitching by properly handling stream assignment
        if (videoElement.srcObject !== stream) {
          videoElement.srcObject = stream;
          
          // Handle video play with proper error handling
          const playVideo = async () => {
            try {
              await videoElement.play();
            } catch (error) {
              console.log('Video play failed, retrying...', error);
              // Retry once after a short delay
              setTimeout(async () => {
                try {
                  await videoElement.play();
                } catch (retryError) {
                  console.warn('Video play retry failed:', retryError);
                }
              }, 100);
            }
          };
          
          playVideo();
        }
      }
    }, [videoElement, stream]);

    // Clean up video element when component unmounts or stream changes
    useEffect(() => {
      return () => {
        if (videoElement) {
          videoElement.srcObject = null;
        }
      };
    }, [videoElement]);

    return (
      <Card 
        className={`relative overflow-hidden cursor-pointer transition-all duration-300 ${
          isSelected 
            ? 'ring-4 ring-orange-400 ring-opacity-75 shadow-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20' 
            : 'bg-slate-800/80 hover:bg-slate-700/80 shadow-lg'
        } backdrop-blur-lg border-white/20`}
        onClick={() => onVideoSelect(streamId)}
      >
        <div className="relative w-full h-full min-h-[120px] sm:min-h-[180px] md:min-h-[240px]">
          {hasVideo ? (
            <video
              ref={setVideoElement}
              autoPlay
              playsInline
              muted={isLocal}
              className="w-full h-full object-cover rounded-lg"
              style={{
                imageRendering: 'auto',
                objectFit: 'cover'
              }}
              onLoadedMetadata={(e) => {
                // Ensure video plays when metadata is loaded
                const video = e.target as HTMLVideoElement;
                video.play().catch(console.warn);
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg">
              <div className="text-center">
                <User className="h-12 w-12 sm:h-16 sm:w-16 text-white/70 mx-auto mb-2" />
                <p className="text-white/90 font-medium text-sm sm:text-base">{participantName}</p>
              </div>
            </div>
          )}
          
          {/* Participant Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge 
                  variant={isHost ? "default" : "secondary"}
                  className={`text-xs ${
                    isHost 
                      ? "bg-yellow-500/90 text-yellow-900" 
                      : "bg-white/20 text-white"
                  }`}
                >
                  {isHost && <Crown className="h-3 w-3 mr-1" />}
                  {participantName}
                  {isLocal && " (You)"}
                </Badge>
              </div>
              
              <div className="flex items-center space-x-1">
                {hasAudio ? (
                  <Mic className="h-4 w-4 text-green-400" />
                ) : (
                  <MicOff className="h-4 w-4 text-red-400" />
                )}
                {hasVideo ? (
                  <Video className="h-4 w-4 text-green-400" />
                ) : (
                  <VideoOff className="h-4 w-4 text-red-400" />
                )}
              </div>
            </div>
          </div>

          {/* Selection Indicator */}
          {isSelected && (
            <div className="absolute top-2 right-2">
              <div className="w-3 h-3 bg-orange-400 rounded-full animate-pulse"></div>
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className={gridClasses} style={gridStyle}>
      {/* Local Video */}
      <VideoCard
        stream={localStream}
        streamId="local"
        participantName={userName}
        isLocal={true}
        isHost={true}
      />
      
      {/* Remote Videos */}
      {remoteStreams.map((remoteStream) => (
        <VideoCard
          key={remoteStream.id}
          stream={remoteStream.stream}
          streamId={remoteStream.id}
          participantName={remoteStream.userName}
        />
      ))}
    </div>
  );
};
