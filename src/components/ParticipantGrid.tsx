
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
  const gridClass = totalParticipants === 1 
    ? 'grid-cols-1' 
    : totalParticipants <= 4 
    ? 'grid-cols-2' 
    : 'grid-cols-3';

  return (
    <div className={`grid ${gridClass} gap-4 h-full min-h-[400px]`}>
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
            <div className="p-6 bg-slate-600/80 rounded-full mb-4 shadow-lg">
              {isVideoEnabled ? (
                <User className="h-16 w-16 text-gray-200" />
              ) : (
                <VideoOff className="h-16 w-16 text-gray-200" />
              )}
            </div>
            <p className="text-white font-semibold text-lg">Camera Off</p>
          </div>
        )}
        
        <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-lg">
          <span className="text-white text-sm font-semibold">{userName} (You)</span>
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
          <div className="p-6 bg-slate-600/80 rounded-full mb-4 shadow-lg">
            <User className="h-16 w-16 text-gray-200" />
          </div>
          <p className="text-white font-semibold text-lg">Camera Off</p>
        </div>
      )}
      
      <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-lg">
        <span className="text-white text-sm font-semibold">{remoteStream.userName}</span>
      </div>
    </Card>
  );
};
