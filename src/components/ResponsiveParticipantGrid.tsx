
import React, { useState, useEffect } from 'react';
import { ParticipantGrid } from '@/components/ParticipantGrid';
import { ParticipantsList } from '@/components/ParticipantsList';

interface RemoteStream {
  id: string;
  stream: MediaStream;
  userName: string;
}

interface Participant {
  id: string;
  user_id: string;
  user_name: string;
  is_host: boolean;
  is_muted: boolean;
  joined_at: string;
}

interface ResponsiveParticipantGridProps {
  localStream: MediaStream | null;
  remoteStreams: RemoteStream[];
  userName: string;
  isVideoEnabled: boolean;
  selectedVideoId?: string;
  onVideoSelect?: (streamId: string) => void;
  showParticipants: boolean;
  participants: Participant[];
  currentUserId: string;
  isHost: boolean;
  onToggleMute: (participantId: string, isMuted: boolean) => void;
}

export const ResponsiveParticipantGrid = ({
  localStream,
  remoteStreams,
  userName,
  isVideoEnabled,
  selectedVideoId,
  onVideoSelect,
  showParticipants,
  participants,
  currentUserId,
  isHost,
  onToggleMute
}: ResponsiveParticipantGridProps) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1">
          <ParticipantGrid
            localStream={localStream}
            remoteStreams={remoteStreams}
            userName={userName}
            isVideoEnabled={isVideoEnabled}
            selectedVideoId={selectedVideoId}
            onVideoSelect={onVideoSelect}
          />
        </div>
        
        {showParticipants && (
          <div className="h-1/3 border-t border-white/20">
            <ParticipantsList
              participants={participants}
              remoteStreams={remoteStreams}
              localStream={localStream}
              currentUserId={currentUserId}
              isHost={isHost}
              onToggleMute={onToggleMute}
              onSelectVideo={onVideoSelect || (() => {})}
              selectedVideoId={selectedVideoId}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="flex-1">
        <ParticipantGrid
          localStream={localStream}
          remoteStreams={remoteStreams}
          userName={userName}
          isVideoEnabled={isVideoEnabled}
          selectedVideoId={selectedVideoId}
          onVideoSelect={onVideoSelect}
        />
      </div>
      
      {showParticipants && (
        <div className="w-80 border-l border-white/20">
          <ParticipantsList
            participants={participants}
            remoteStreams={remoteStreams}
            localStream={localStream}
            currentUserId={currentUserId}
            isHost={isHost}
            onToggleMute={onToggleMute}
            onSelectVideo={onVideoSelect || (() => {})}
            selectedVideoId={selectedVideoId}
          />
        </div>
      )}
    </div>
  );
};
