
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
      <Card className="relative overflow-hidden bg-slate-800 border-2 border-yellow-400/50">
        {isVideoEnabled && localStream ? (
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-700">
            <div className="p-4 bg-slate-600 rounded-full mb-4">
              {isVideoEnabled ? (
                <User className="h-12 w-12 text-gray-300" />
              ) : (
                <VideoOff className="h-12 w-12 text-gray-300" />
              )}
            </div>
            <p className="text-white font-semibold">Camera Off</p>
          </div>
        )}
        
        <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full">
          <span className="text-white text-sm font-medium">{userName} (You)</span>
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
    }
  }, [remoteStream.stream]);

  return (
    <Card className="relative overflow-hidden bg-slate-800 border-white/20">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      
      <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full">
        <span className="text-white text-sm font-medium">{remoteStream.userName}</span>
      </div>
    </Card>
  );
};
