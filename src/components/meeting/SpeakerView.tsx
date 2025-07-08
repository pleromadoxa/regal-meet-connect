
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Video, VideoOff, Crown, User } from 'lucide-react';

interface RemoteStream {
  id: string;
  stream: MediaStream;
  userName: string;
}

interface SpeakerViewProps {
  localStream: MediaStream | null;
  remoteStreams: RemoteStream[];
  userName: string;
  selectedVideoId: string;
  isCurrentUserHost: boolean;
  participants: any[];
}

export const SpeakerView = ({
  localStream,
  remoteStreams,
  userName,
  selectedVideoId,
  isCurrentUserHost,
  participants
}: SpeakerViewProps) => {
  // Get the selected stream (main speaker)
  const getSelectedStream = () => {
    if (selectedVideoId === 'local') {
      return { stream: localStream, name: userName, isLocal: true };
    }
    
    const remoteStream = remoteStreams.find(s => s.id === selectedVideoId);
    if (remoteStream) {
      return { stream: remoteStream.stream, name: remoteStream.userName, isLocal: false };
    }
    
    // Default to first available stream
    if (remoteStreams.length > 0) {
      return { stream: remoteStreams[0].stream, name: remoteStreams[0].userName, isLocal: false };
    }
    
    return { stream: localStream, name: userName, isLocal: true };
  };

  const selectedStream = getSelectedStream();
  const hasVideo = selectedStream.stream && 
    selectedStream.stream.getVideoTracks().length > 0 && 
    selectedStream.stream.getVideoTracks()[0].enabled;

  const hasAudio = selectedStream.stream && 
    selectedStream.stream.getAudioTracks().length > 0 && 
    selectedStream.stream.getAudioTracks()[0].enabled;

  // Check if participant is host
  const isParticipantHost = (participantName: string) => {
    const participant = participants.find(p => p.user_name === participantName);
    return participant?.is_host || false;
  };

  const isSelectedHost = selectedStream.isLocal ? isCurrentUserHost : isParticipantHost(selectedStream.name);

  return (
    <div className="flex-1 relative bg-slate-900 rounded-2xl overflow-hidden shadow-2xl">
      {hasVideo ? (
        <video
          ref={(video) => {
            if (video && selectedStream.stream) {
              video.srcObject = selectedStream.stream;
              video.play().catch(console.warn);
            }
          }}
          autoPlay
          playsInline
          muted={selectedStream.isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
          <div className="text-center">
            <div className="w-32 h-32 bg-slate-700 rounded-full flex items-center justify-center mb-6 mx-auto">
              <User className="h-16 w-16 text-slate-400" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-2">
              {selectedStream.name}
              {selectedStream.isLocal && " (You)"}
            </h3>
            {isSelectedHost && (
              <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-400/40">
                <Crown className="h-4 w-4 mr-1" />
                Host
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Overlay with participant info */}
      <div className="absolute bottom-6 left-6 right-6">
        <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-semibold text-white">
                  {selectedStream.name}
                  {selectedStream.isLocal && " (You)"}
                </h3>
                {isSelectedHost && (
                  <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-400/40 text-sm">
                    <Crown className="h-3 w-3 mr-1" />
                    Host
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {hasAudio ? (
                <div className="p-2 bg-green-500/20 rounded-lg border border-green-400/40">
                  <Mic className="h-5 w-5 text-green-400" />
                </div>
              ) : (
                <div className="p-2 bg-red-500/20 rounded-lg border border-red-400/40">
                  <MicOff className="h-5 w-5 text-red-400" />
                </div>
              )}
              
              {hasVideo ? (
                <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-400/40">
                  <Video className="h-5 w-5 text-blue-400" />
                </div>
              ) : (
                <div className="p-2 bg-red-500/20 rounded-lg border border-red-400/40">
                  <VideoOff className="h-5 w-5 text-red-400" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
