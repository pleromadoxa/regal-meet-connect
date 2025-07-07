
import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
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
}

export const ParticipantGrid = ({ 
  localStream, 
  remoteStreams, 
  userName, 
  isVideoEnabled 
}: ParticipantGridProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const totalParticipants = remoteStreams.length + 1;
  
  const getGridClass = () => {
    if (totalParticipants === 1) return 'grid-cols-1';
    if (totalParticipants === 2) return 'grid-cols-1 sm:grid-cols-2';
    if (totalParticipants <= 4) return 'grid-cols-2';
    return 'grid-cols-2 sm:grid-cols-3';
  };

  return (
    <div className={`grid ${getGridClass()} gap-2 sm:gap-4 h-full min-h-[300px] sm:min-h-[400px]`}>
      {/* Local Video */}
      <Card className="relative overflow-hidden bg-slate-800/90 border-2 border-yellow-400/70 shadow-2xl backdrop-blur-sm">
        {isVideoEnabled && localStream ? (
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
            <div className="p-4 sm:p-6 bg-slate-600/80 rounded-full mb-2 sm:mb-4 shadow-lg">
              {isVideoEnabled ? (
                <User className="h-8 w-8 sm:h-16 sm:w-16 text-gray-200" />
              ) : (
                <VideoOff className="h-8 w-8 sm:h-16 sm:w-16 text-gray-200" />
              )}
            </div>
            <p className="text-white font-semibold text-sm sm:text-lg">Camera Off</p>
          </div>
        )}
        
        <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 bg-black/70 backdrop-blur-md px-2 sm:px-4 py-1 sm:py-2 rounded-full border border-white/20 shadow-lg">
          <span className="text-white text-xs sm:text-sm font-semibold">{userName} (You)</span>
        </div>
      </Card>

      {/* Remote Videos */}
      {remoteStreams.map((remote) => (
        <RemoteVideo key={remote.id} remoteStream={remote} />
      ))}
    </div>
  );
};

interface RemoteVideoProps {
  remoteStream: RemoteStream;
}

const RemoteVideo = ({ remoteStream }: RemoteVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && remoteStream.stream) {
      videoRef.current.srcObject = remoteStream.stream;
      console.log('Setting remote stream for:', remoteStream.userName);
    }
  }, [remoteStream.stream]);

  const hasVideo = remoteStream.stream?.getVideoTracks().length > 0;

  return (
    <Card className="relative overflow-hidden bg-slate-800/90 border-2 border-white/30 shadow-2xl backdrop-blur-sm">
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
          <div className="p-4 sm:p-6 bg-slate-600/80 rounded-full mb-2 sm:mb-4 shadow-lg">
            <User className="h-8 w-8 sm:h-16 sm:w-16 text-gray-200" />
          </div>
          <p className="text-white font-semibold text-sm sm:text-lg">Camera Off</p>
        </div>
      )}
      
      <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 bg-black/70 backdrop-blur-md px-2 sm:px-4 py-1 sm:py-2 rounded-full border border-white/20 shadow-lg">
        <span className="text-white text-xs sm:text-sm font-semibold">{remoteStream.userName}</span>
      </div>
    </Card>
  );
};
