
import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { User, Mic, MicOff, Crown } from 'lucide-react';

interface RemoteStream {
  id: string;
  stream: MediaStream;
  userName: string;
}

interface MobileParticipantGridProps {
  localStream: MediaStream | null;
  remoteStreams: RemoteStream[];
  userName: string;
  selectedVideoId: string;
  onVideoSelect: (streamId: string) => void;
  isCurrentUserHost: boolean;
  participants: any[];
}

export const MobileParticipantGrid = ({
  localStream,
  remoteStreams,
  userName,
  selectedVideoId,
  onVideoSelect,
  isCurrentUserHost,
  participants
}: MobileParticipantGridProps) => {
  // Check if participant is host
  const isParticipantHost = (participantName: string) => {
    const participant = participants.find(p => p.user_name === participantName);
    return participant?.is_host || false;
  };

  // Get all streams for easier management
  const allStreams = [
    { id: 'local', stream: localStream, userName, isLocal: true },
    ...remoteStreams.map(stream => ({ ...stream, isLocal: false }))
  ];

  // Find selected stream or default to first available
  const selectedStream = allStreams.find(s => s.id === selectedVideoId) || allStreams[0];
  const otherStreams = allStreams.filter(s => s.id !== selectedStream?.id);

  const ParticipantCard = ({ 
    stream, 
    streamId, 
    participantName, 
    isLocal = false,
    isMainVideo = false
  }: {
    stream: MediaStream | null;
    streamId: string;
    participantName: string;
    isLocal?: boolean;
    isMainVideo?: boolean;
  }) => {
    const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
    const isSelected = selectedVideoId === streamId;
    const hasVideo = stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled;
    const hasAudio = stream && stream.getAudioTracks().length > 0 && stream.getAudioTracks()[0].enabled;
    const isHost = isLocal ? isCurrentUserHost : isParticipantHost(participantName);

    // Handle video stream assignment with proper cleanup
    useEffect(() => {
      if (videoElement && stream && hasVideo) {
        if (videoElement.srcObject !== stream) {
          videoElement.srcObject = stream;
          
          const playVideo = async () => {
            try {
              await videoElement.play();
            } catch (error) {
              console.warn('Video play failed:', error);
              setTimeout(async () => {
                try {
                  if (videoElement.srcObject === stream) {
                    await videoElement.play();
                  }
                } catch (retryError) {
                  console.warn('Video play retry failed:', retryError);
                }
              }, 200);
            }
          };
          
          playVideo();
        }
      }
    }, [videoElement, stream, hasVideo]);

    useEffect(() => {
      return () => {
        if (videoElement) {
          videoElement.srcObject = null;
        }
      };
    }, [videoElement]);

    if (isMainVideo) {
      return (
        <div className="relative w-full h-full rounded-2xl overflow-hidden bg-slate-800 border-2 border-orange-400">
          {hasVideo ? (
            <video
              ref={setVideoElement}
              autoPlay
              playsInline
              muted={isLocal}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-700">
              <div className="w-20 h-20 bg-slate-600 rounded-full flex items-center justify-center mb-4">
                <User className="h-10 w-10 text-slate-300" />
              </div>
            </div>
          )}

          {/* Orange dot indicator */}
          <div className="absolute top-4 left-4 w-3 h-3 bg-orange-400 rounded-full"></div>

          {/* Status indicators */}
          <div className="absolute top-4 right-4 flex space-x-2">
            {!hasAudio && (
              <div className="p-1.5 bg-red-500/90 rounded-full">
                <MicOff className="h-3 w-3 text-white" />
              </div>
            )}
            {isHost && (
              <div className="p-1.5 bg-yellow-500/90 rounded-full">
                <Crown className="h-3 w-3 text-white" />
              </div>
            )}
          </div>

          {/* Name overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="flex items-center justify-between">
              <p className="text-white text-lg font-medium">
                {participantName}
                {isLocal && " (You)"}
              </p>
              {hasAudio && (
                <div className="flex items-center space-x-1">
                  <Mic className="h-4 w-4 text-green-400" />
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <Card 
        className="relative overflow-hidden cursor-pointer transition-all duration-200 bg-slate-800/90 border border-slate-600 hover:border-orange-400 rounded-xl w-full h-full"
        onClick={() => onVideoSelect(streamId)}
      >
        <div className="w-full h-full relative">
          {hasVideo ? (
            <video
              ref={setVideoElement}
              autoPlay
              playsInline
              muted={isLocal}
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-700 rounded-xl">
              <User className="h-6 w-6 text-slate-400" />
            </div>
          )}

          {/* Status indicators */}
          <div className="absolute top-1 right-1 flex space-x-1">
            {!hasAudio && (
              <div className="p-1 bg-red-500/90 rounded-full">
                <MicOff className="h-2 w-2 text-white" />
              </div>
            )}
            {isHost && (
              <div className="p-1 bg-yellow-500/90 rounded-full">
                <Crown className="h-2 w-2 text-white" />
              </div>
            )}
          </div>

          {/* Name label for thumbnails */}
          <div className="absolute bottom-1 left-1 text-xs text-white bg-black/60 rounded px-1">
            {participantName.split(' ')[0]}
            {isLocal && " (You)"}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="flex flex-col h-full p-4 pb-24 space-y-4">
      {/* Main video */}
      <div className="flex-1 min-h-[300px] max-h-[calc(100vh-200px)]">
        {selectedStream && (
          <ParticipantCard
            stream={selectedStream.stream}
            streamId={selectedStream.id}
            participantName={selectedStream.userName}
            isLocal={selectedStream.isLocal}
            isMainVideo={true}
          />
        )}
      </div>

      {/* Thumbnail videos */}
      {otherStreams.length > 0 && (
        <div className="flex space-x-3 overflow-x-auto pb-2 min-h-[90px]">
          {otherStreams.map((stream) => (
            <div key={stream.id} className="flex-shrink-0 w-28 h-20">
              <ParticipantCard
                stream={stream.stream}
                streamId={stream.id}
                participantName={stream.userName}
                isLocal={stream.isLocal}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
