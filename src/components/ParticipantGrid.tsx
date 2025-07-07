
import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { VideoReactions } from '@/components/VideoReactions';
import { User, VideoOff } from 'lucide-react';

interface RemoteStream {
  id: string;
  stream: MediaStream;
  userName: string;
}

interface ParticipantGridProps {
  localStream: MediaStream | null;
  remoteStreams: RemoteStream[];
  userName: string;
  isVideoEnabled: boolean;
  selectedVideoId?: string;
  onVideoSelect?: (streamId: string) => void;
}

export const ParticipantGrid = ({ 
  localStream, 
  remoteStreams, 
  userName, 
  isVideoEnabled,
  selectedVideoId,
  onVideoSelect
}: ParticipantGridProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Find the selected stream or default to local
  const selectedStream = selectedVideoId 
    ? remoteStreams.find(s => s.id === selectedVideoId) || { 
        id: 'local', 
        stream: localStream, 
        userName: userName + ' (You)' 
      }
    : { id: 'local', stream: localStream, userName: userName + ' (You)' };

  const otherStreams = selectedVideoId 
    ? [
        { id: 'local', stream: localStream, userName: userName + ' (You)' },
        ...remoteStreams.filter(s => s.id !== selectedVideoId)
      ]
    : remoteStreams;

  return (
    <div className="h-full flex flex-col space-y-2 sm:space-y-4">
      {/* Main Video - Selected participant with reactions overlay */}
      <div className="flex-1 min-h-0 relative">
        <Card className="relative overflow-hidden bg-slate-800/90 border-2 border-orange-400/70 shadow-2xl backdrop-blur-sm h-full">
          {selectedStream && selectedStream.stream && (selectedStream.id === 'local' ? isVideoEnabled : true) ? (
            <MainVideo 
              stream={selectedStream.stream} 
              userName={selectedStream.userName}
              isLocal={selectedStream.id === 'local'}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
              <div className="p-6 sm:p-8 bg-slate-600/80 rounded-full mb-4 shadow-lg">
                <User className="h-12 w-12 sm:h-20 sm:w-20 text-gray-200" />
              </div>
              <p className="text-white font-semibold text-lg sm:text-xl">Camera Off</p>
            </div>
          )}
          
          <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-lg">
            <span className="text-white text-sm sm:text-base font-semibold">
              {selectedStream?.userName || 'No participant'}
            </span>
          </div>

          {/* Video Reactions Overlay for Main Video */}
          <div className="absolute inset-0 pointer-events-none">
            <VideoReactions />
          </div>
        </Card>
      </div>

      {/* Thumbnail Videos - Other participants */}
      {otherStreams.length > 0 && (
        <div className="flex space-x-2 sm:space-x-4 overflow-x-auto pb-2">
          {otherStreams.map((stream) => (
            <Card 
              key={stream.id} 
              className={`relative overflow-hidden bg-slate-800/90 border-2 shadow-xl backdrop-blur-sm flex-shrink-0 w-32 h-24 sm:w-48 sm:h-36 cursor-pointer transition-all duration-200 ${
                selectedVideoId === stream.id 
                  ? 'border-orange-400/70' 
                  : 'border-white/30 hover:border-white/50'
              }`}
              onClick={() => onVideoSelect?.(stream.id)}
            >
              {stream.stream && (stream.id === 'local' ? isVideoEnabled : true) ? (
                <ThumbnailVideo 
                  stream={stream.stream} 
                  userName={stream.userName}
                  isLocal={stream.id === 'local'}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
                  <User className="h-6 w-6 sm:h-8 sm:w-8 text-gray-200 mb-1" />
                  <VideoOff className="h-4 w-4 text-gray-400" />
                </div>
              )}
              
              <div className="absolute bottom-1 left-1 bg-black/70 backdrop-blur-md px-2 py-1 rounded text-xs">
                <span className="text-white font-medium truncate max-w-[100px] block">
                  {stream.userName}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

interface VideoProps {
  stream: MediaStream;
  userName: string;
  isLocal: boolean;
}

const MainVideo = ({ stream, isLocal }: VideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted={isLocal}
      playsInline
      className="w-full h-full object-cover"
    />
  );
};

const ThumbnailVideo = ({ stream, isLocal }: VideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted={isLocal}
      playsInline
      className="w-full h-full object-cover"
    />
  );
};
