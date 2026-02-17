import React, { useEffect, useRef } from 'react';
import { Loader2, Mic, MicOff, Video, VideoOff, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WaitingRoomProps {
  meetingTitle?: string;
  localStream?: MediaStream | null;
  isVideoEnabled?: boolean;
  isAudioEnabled?: boolean;
  onToggleVideo?: () => Promise<boolean>;
  onToggleAudio?: () => Promise<boolean>;
}

export const WaitingRoom = ({
  meetingTitle = "Meeting",
  localStream,
  isVideoEnabled = true,
  isAudioEnabled = true,
  onToggleVideo,
  onToggleAudio
}: WaitingRoomProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [verse, setVerse] = React.useState('');

  useEffect(() => {
    const bibleVerses = [
      "For I know the plans I have for you, declares the Lord, plans for welfare and not for evil, to give you a future and a hope. - Jeremiah 29:11",
      "But they who wait for the Lord shall renew their strength; they shall mount up with wings like eagles; they shall run and not be weary; they shall walk and not faint. - Isaiah 40:31",
      "Be strong and courageous. Do not be frightened, and do not be dismayed, for the Lord your God is with you wherever you go. - Joshua 1:9",
      "And we know that in all things God works for the good of those who love him, who have been called according to his purpose. - Romans 8:28",
      "Trust in the Lord with all your heart, and do not lean on your own understanding. In all your ways acknowledge him, and he will make straight your paths. - Proverbs 3:5-6",
      "The Lord is my shepherd; I shall not want. - Psalm 23:1",
      "I can do all things through him who strengthens me. - Philippians 4:13",
      "Cast all your anxiety on him because he cares for you. - 1 Peter 5:7",
      "The Lord is my light and my salvation; whom shall I fear? The Lord is the stronghold of my life; of whom shall I be afraid? - Psalm 27:1",
      "Come to me, all who labor and are heavy laden, and I will give you rest. - Matthew 11:28"
    ];
    setVerse(bibleVerses[Math.floor(Math.random() * bibleVerses.length)]);
  }, []);

  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 md:gap-12 items-center">
        {/* Left Column - Video Preview */}
        <div className="relative aspect-video bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl animate-fade-in">
          {localStream && (
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
              <div className="h-24 w-24 rounded-full bg-zinc-800 flex items-center justify-center">
                 <VideoOff className="h-10 w-10 text-zinc-500" />
              </div>
            </div>
          )}

          {/* Controls Overlay */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-4 p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
            {onToggleAudio && (
              <Button
                variant={isAudioEnabled ? "ghost" : "destructive"}
                size="icon"
                className={`rounded-full h-10 w-10 ${isAudioEnabled ? 'hover:bg-white/10 text-white' : ''}`}
                onClick={onToggleAudio}
              >
                {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>
            )}

            {onToggleVideo && (
              <Button
                variant={isVideoEnabled ? "ghost" : "destructive"}
                size="icon"
                className={`rounded-full h-10 w-10 ${isVideoEnabled ? 'hover:bg-white/10 text-white' : ''}`}
                onClick={onToggleVideo}
              >
                {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </Button>
            )}

            <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-10 w-10 hover:bg-white/10 text-white"
            >
                <Sparkles className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Right Column - Status */}
        <div className="space-y-8 text-center md:text-left animate-fade-in-up">
           <div className="inline-block p-4 bg-blue-500/10 rounded-full mb-4 animate-pulse">
             <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
           </div>

          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-white">Waiting to join...</h1>
            <p className="text-zinc-400 text-lg leading-relaxed">
              You are in the waiting room for <span className="font-semibold text-white">{meetingTitle}</span>.
              <br className="hidden md:block"/>
              The host will admit you shortly.
            </p>
          </div>

          <div className="pt-8 border-t border-white/5 space-y-6">
             {verse && (
               <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                 <p className="text-zinc-300 italic text-sm leading-relaxed">
                   "{verse}"
                 </p>
               </div>
             )}
             <p className="text-sm text-zinc-500">
               Meeting ID: <span className="font-mono text-zinc-400">{meetingTitle}</span>
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};
