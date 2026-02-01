import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Video, VideoOff, Settings, Sparkles, Image as ImageIcon, Ban } from 'lucide-react';
import { useLocalPreview } from '@/hooks/useLocalPreview';
import { AudioVisualizer } from '@/components/AudioVisualizer';
import { useAudioVisualizer } from '@/hooks/useAudioVisualizer';
import { useVirtualBackground, BackgroundEffect } from '@/hooks/useVirtualBackground';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from 'react';

interface PreJoinScreenProps {
  userName: string;
  meetingId: string;
  onJoin: (videoEnabled: boolean, audioEnabled: boolean, processedStream: MediaStream | null) => void;
  onCancel: () => void;
}

export const PreJoinScreen = ({ userName, meetingId, onJoin, onCancel }: PreJoinScreenProps) => {
  const { stream, isVideoEnabled, isAudioEnabled, toggleVideo, toggleAudio } = useLocalPreview();
  const { volume, isActive, avgVolume } = useAudioVisualizer(stream, isAudioEnabled);
  const [effect, setEffect] = useState<BackgroundEffect>('none');
  const processedStream = useVirtualBackground({
    stream,
    effect,
    blurRadius: 10,
    backgroundImageUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' // Default fancy background
  });

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      if (processedStream && effect !== 'none') {
          videoRef.current.srcObject = processedStream;
      } else if (stream) {
          videoRef.current.srcObject = stream;
      }
    }
  }, [stream, processedStream, effect]);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left Column: Preview */}
        <div className="space-y-4">
          <div className="relative aspect-video bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 shadow-2xl">
            {stream && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
              />
            )}

            {!isVideoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                <div className="h-24 w-24 rounded-full bg-zinc-800 flex items-center justify-center text-3xl font-bold text-white uppercase">
                  {userName.charAt(0)}
                </div>
              </div>
            )}

            {/* Controls Overlay */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
              <Button
                variant={isAudioEnabled ? "secondary" : "destructive"}
                size="icon"
                className="rounded-full h-12 w-12 shadow-lg"
                onClick={toggleAudio}
              >
                {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>
              <Button
                variant={isVideoEnabled ? "secondary" : "destructive"}
                size="icon"
                className="rounded-full h-12 w-12 shadow-lg"
                onClick={toggleVideo}
              >
                {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={effect !== 'none' ? "default" : "secondary"}
                    size="icon"
                    className="rounded-full h-12 w-12 shadow-lg"
                  >
                    <Sparkles className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Background Effects</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setEffect('none')}>
                    <Ban className="mr-2 h-4 w-4" /> None
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEffect('blur')}>
                    <Settings className="mr-2 h-4 w-4" /> Blur
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEffect('image')}>
                    <ImageIcon className="mr-2 h-4 w-4" /> Virtual Office
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Audio Visualizer */}
            <div className="absolute bottom-4 right-4">
              {stream && isAudioEnabled && (
                <div className="bg-black/50 p-2 rounded-lg backdrop-blur-sm">
                   <AudioVisualizer
                     volume={volume}
                     isActive={isActive}
                     avgVolume={avgVolume}
                     hasAudio={isAudioEnabled}
                   />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Info & Actions */}
        <div className="space-y-8 text-center md:text-left">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">Ready to join Regal Meeting?</h1>
            <p className="text-zinc-400">
              You are about to join the session as <span className="text-white font-semibold">{userName}</span>
            </p>
          </div>

          <div className="flex flex-col gap-3 max-w-xs mx-auto md:mx-0">
            <Button
              size="lg"
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold text-lg py-6"
              onClick={() => onJoin(isVideoEnabled, isAudioEnabled, processedStream)}
            >
              Join Now
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-900"
              onClick={onCancel}
            >
              Cancel
            </Button>
          </div>

          <div className="text-sm text-zinc-500">
             Meeting ID: <span className="font-mono">{meetingId}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
