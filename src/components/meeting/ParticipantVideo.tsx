
import React, { useRef, useEffect } from 'react';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { ParticipantState } from '@/hooks/useMeetingState';

interface ParticipantVideoProps {
  participant?: ParticipantState;
  stream?: MediaStream;
  userName: string;
  isLocalUser?: boolean;
  isVideoEnabled?: boolean;
  isAudioEnabled?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  showControls?: boolean;
}

export const ParticipantVideo = ({
  participant,
  stream,
  userName,
  isLocalUser = false,
  isVideoEnabled = true,
  isAudioEnabled = true,
  isSelected = false,
  onClick,
  showControls = true
}: ParticipantVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const displayVideoEnabled = participant?.isVideoEnabled ?? isVideoEnabled;
  const displayAudioEnabled = participant?.isAudioEnabled ?? isAudioEnabled;
  const displayName = participant?.userName || userName;

  return (
    <div 
      className={`relative bg-slate-800 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
        isSelected ? 'ring-2 ring-blue-400' : 'hover:ring-1 hover:ring-white/30'
      }`}
      onClick={onClick}
    >
      {displayVideoEnabled && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocalUser}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-slate-700">
          <div className="w-16 h-16 bg-slate-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-lg">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      )}
      
      {showControls && (
        <div className="absolute bottom-2 left-2 flex space-x-1">
          <div className={`p-1 rounded-full ${displayAudioEnabled ? 'bg-green-500' : 'bg-red-500'}`}>
            {displayAudioEnabled ? (
              <Mic className="h-3 w-3 text-white" />
            ) : (
              <MicOff className="h-3 w-3 text-white" />
            )}
          </div>
          <div className={`p-1 rounded-full ${displayVideoEnabled ? 'bg-green-500' : 'bg-red-500'}`}>
            {displayVideoEnabled ? (
              <Video className="h-3 w-3 text-white" />
            ) : (
              <VideoOff className="h-3 w-3 text-white" />
            )}
          </div>
        </div>
      )}
      
      <div className="absolute bottom-1 right-2">
        <span className="text-white text-xs bg-black/50 px-1 rounded">
          {displayName}
        </span>
      </div>
    </div>
  );
};
