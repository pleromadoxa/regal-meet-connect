import React from 'react';
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  Settings, Hand, PhoneOff, RotateCcw, Sparkles, Captions, CaptionsOff,
  LayoutDashboard, MoreVertical, MessageSquare, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface VideoControlsDockProps {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  captionsEnabled: boolean;
  showSettings: boolean;
  showChat: boolean;
  handRaised: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onToggleScreenShare: () => void;
  onSwitchCamera: () => void;
  onToggleCaptions: () => void;
  onToggleSettings: () => void;
  onToggleChat: () => void;
  onToggleHand: () => void;
  onToggleEffects: () => void;
  onNavigateToDashboard?: () => void;
  onLeaveMeeting: () => void;
  onToggleParticipants?: () => void;
}

/**
 * Floating circular control buttons — Regal glass call bar (design mock).
 */
export const VideoControlsDock = ({
  isVideoEnabled, isAudioEnabled, isScreenSharing, captionsEnabled,
  showChat, handRaised,
  onToggleVideo, onToggleAudio, onToggleScreenShare, onSwitchCamera,
  onToggleCaptions, onToggleSettings, onToggleHand, onToggleEffects,
  onNavigateToDashboard, onLeaveMeeting, onToggleParticipants,
}: VideoControlsDockProps) => {
  const isMobile = useIsMobile();

  const circle =
    'h-12 w-12 sm:h-[3.75rem] sm:w-[3.75rem] rounded-full flex shrink-0 items-center justify-center shadow-xl transition-all duration-150 active:scale-95 touch-target';
  const light =
    'bg-white text-neutral-900 hover:bg-white/90 border border-white/80';
  const muted =
    'bg-red-500 text-white hover:bg-red-500/90 border border-red-400/50';
  const active =
    'bg-primary text-primary-foreground hover:bg-primary/90 border border-primary/40';

  const Btn = ({
    onClick,
    label,
    children,
    variant = 'light',
    pressed = false,
  }: {
    onClick: () => void;
    label: string;
    children: React.ReactNode;
    variant?: 'light' | 'muted' | 'active' | 'end';
    pressed?: boolean;
  }) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        circle,
        variant === 'end' && 'bg-red-600 text-white hover:bg-red-500 border border-red-500 shadow-red-900/40',
        variant === 'light' && light,
        variant === 'muted' && muted,
        variant === 'active' && active,
        pressed && 'ring-2 ring-white/50'
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-50 flex justify-center px-2 safe-area-inset-bottom sm:bottom-6">
      <div className="pointer-events-auto max-w-full overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2 px-1 sm:gap-3.5">
          <Btn
            onClick={onToggleAudio}
            label={isAudioEnabled ? 'Mute' : 'Unmute'}
            variant={isAudioEnabled ? 'light' : 'muted'}
          >
            {isAudioEnabled ? <Mic className="h-5 w-5 sm:h-6 sm:w-6" /> : <MicOff className="h-5 w-5 sm:h-6 sm:w-6" />}
          </Btn>

          <Btn
            onClick={onToggleVideo}
            label={isVideoEnabled ? 'Stop video' : 'Start video'}
            variant={isVideoEnabled ? 'light' : 'muted'}
          >
            {isVideoEnabled ? <Video className="h-5 w-5 sm:h-6 sm:w-6" /> : <VideoOff className="h-5 w-5 sm:h-6 sm:w-6" />}
          </Btn>

          {!isMobile && (
            <Btn
              onClick={onToggleScreenShare}
              label={isScreenSharing ? 'Stop sharing' : 'Share screen'}
              variant={isScreenSharing ? 'active' : 'light'}
            >
              {isScreenSharing ? <MonitorOff className="h-5 w-5 sm:h-6 sm:w-6" /> : <Monitor className="h-5 w-5 sm:h-6 sm:w-6" />}
            </Btn>
          )}

          <Btn
            onClick={onToggleHand}
            label={handRaised ? 'Lower hand' : 'Raise hand'}
            variant={handRaised ? 'active' : 'light'}
          >
            <Hand className="h-5 w-5 sm:h-6 sm:w-6" />
          </Btn>

          {isMobile && onToggleParticipants && (
            <Btn onClick={onToggleParticipants} label="Participants" variant="light">
              <Users className="h-5 w-5 sm:h-6 sm:w-6" />
            </Btn>
          )}

          {isMobile && (
            <Btn
              onClick={onToggleChat}
              label={showChat ? 'Close chat' : 'Open chat'}
              variant={showChat ? 'active' : 'light'}
              pressed={showChat}
            >
              <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />
            </Btn>
          )}

          {!isMobile ? (
            <>
              <Btn onClick={onToggleSettings} label="Settings" variant="light">
                <Settings className="h-5 w-5 sm:h-6 sm:w-6" />
              </Btn>
              <Btn
                onClick={onToggleChat}
                label={showChat ? 'Close chat' : 'Open chat'}
                variant={showChat ? 'active' : 'light'}
                pressed={showChat}
              >
                <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />
              </Btn>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(circle, light)}
                  aria-label="More options"
                >
                  <MoreVertical className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="center"
                className="border-white/10 bg-black/90 text-white backdrop-blur-xl"
              >
                <DropdownMenuItem onClick={onToggleScreenShare}>
                  <Monitor className="mr-2 h-4 w-4" />
                  {isScreenSharing ? 'Stop sharing' : 'Present'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onToggleCaptions}>
                  {captionsEnabled ? (
                    <CaptionsOff className="mr-2 h-4 w-4" />
                  ) : (
                    <Captions className="mr-2 h-4 w-4" />
                  )}
                  Captions
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSwitchCamera}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Flip camera
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onToggleEffects}>
                  <Sparkles className="mr-2 h-4 w-4" /> Visual effects
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onToggleSettings}>
                  <Settings className="mr-2 h-4 w-4" /> Device settings
                </DropdownMenuItem>
                {onNavigateToDashboard && (
                  <DropdownMenuItem onClick={onNavigateToDashboard}>
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Btn onClick={onLeaveMeeting} label="Leave call" variant="end">
            <PhoneOff className="h-5 w-5 sm:h-6 sm:w-6" />
          </Btn>
        </div>
      </div>
    </div>
  );
};
