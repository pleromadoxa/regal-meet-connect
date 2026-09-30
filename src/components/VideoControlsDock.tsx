import React, { useState } from 'react';
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  Settings, Hand, PhoneOff, RotateCcw, Sparkles, Captions, CaptionsOff,
  LayoutDashboard, MoreVertical, MessageSquare, Users, Smile, ListTodo
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useOptionalMeetingReactions } from '@/contexts/MeetingReactionsContext';
import { QUICK_REACTIONS, REACTION_EMOJI } from '@/lib/meetingReactions';

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
  onToggleBrief?: () => void;
  showBrief?: boolean;
}

const circle =
  'h-12 w-12 sm:h-[3.75rem] sm:w-[3.75rem] rounded-full flex shrink-0 items-center justify-center shadow-xl transition-all duration-150 active:scale-95 touch-target';
const light = 'bg-white text-neutral-900 hover:bg-white/90 border border-white/80';
const muted = 'bg-red-500 text-white hover:bg-red-500/90 border border-red-400/50';
const active = 'bg-primary text-primary-foreground hover:bg-primary/90 border border-primary/40';

function DockBtn({
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
}) {
  return (
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
}

function MobileTool({
  label,
  onClick,
  active: isActive,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={isActive}
      className={cn(
        'flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 touch-target',
        'text-white/80 transition active:scale-95',
        isActive && 'text-primary'
      )}
    >
      <span
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full',
          isActive ? 'bg-primary/20 text-primary' : 'bg-white/10 text-white'
        )}
      >
        {children}
      </span>
      <span className="max-w-[4.25rem] truncate text-[10px] font-medium leading-none tracking-wide">
        {label}
      </span>
    </button>
  );
}

/**
 * Floating circular control buttons — Regal glass call bar (design mock).
 * On phones this becomes a native-style glass footer with every tool visible.
 */
export const VideoControlsDock = ({
  isVideoEnabled, isAudioEnabled, isScreenSharing, captionsEnabled,
  showChat, handRaised,
  onToggleVideo, onToggleAudio, onToggleScreenShare, onSwitchCamera,
  onToggleCaptions, onToggleSettings, onToggleChat, onToggleHand, onToggleEffects,
  onNavigateToDashboard, onLeaveMeeting, onToggleParticipants,
  onToggleBrief, showBrief = false,
}: VideoControlsDockProps) => {
  const isMobile = useIsMobile();
  const [showReactions, setShowReactions] = useState(false);
  const reactions = useOptionalMeetingReactions();

  if (isMobile) {
    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50">
        {showReactions && (
          <div className="pointer-events-auto mx-3 mb-2 flex items-center justify-center gap-2 rounded-full border border-white/15 bg-black/70 px-3 py-2 shadow-xl backdrop-blur-2xl">
            {QUICK_REACTIONS.map((type) => (
              <button
                key={type}
                type="button"
                aria-label={`React ${type}`}
                className="flex h-11 w-11 items-center justify-center rounded-full text-xl active:scale-90"
                onClick={() => {
                  void reactions?.sendReaction(type);
                  setShowReactions(false);
                }}
              >
                {REACTION_EMOJI[type]}
              </button>
            ))}
          </div>
        )}

        <div
          className={cn(
            'pointer-events-auto border-t border-white/10 bg-[#11131a]/92 backdrop-blur-2xl',
            'rounded-t-[28px] px-3 pt-2 shadow-[0_-8px_30px_rgba(0,0,0,0.45)]',
            'pb-[max(0.65rem,env(safe-area-inset-bottom))]'
          )}
        >
          <div className="grid grid-cols-6 gap-0.5 pb-1">
            <MobileTool label={showChat ? 'Chat on' : 'Chat'} onClick={onToggleChat} active={showChat}>
              <MessageSquare className="h-4 w-4" />
            </MobileTool>
            <MobileTool
              label={handRaised ? 'Lower' : 'Hand'}
              onClick={onToggleHand}
              active={handRaised}
            >
              <Hand className="h-4 w-4" />
            </MobileTool>
            <MobileTool
              label={captionsEnabled ? 'CC on' : 'Captions'}
              onClick={onToggleCaptions}
              active={captionsEnabled}
            >
              {captionsEnabled ? <CaptionsOff className="h-4 w-4" /> : <Captions className="h-4 w-4" />}
            </MobileTool>
            <MobileTool
              label={isScreenSharing ? 'Stop' : 'Present'}
              onClick={onToggleScreenShare}
              active={isScreenSharing}
            >
              {isScreenSharing ? <MonitorOff className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
            </MobileTool>
            {onToggleBrief ? (
              <MobileTool label="Brief" onClick={onToggleBrief} active={showBrief}>
                <ListTodo className="h-4 w-4" />
              </MobileTool>
            ) : (
              <MobileTool
                label="React"
                onClick={() => setShowReactions((v) => !v)}
                active={showReactions}
              >
                <Smile className="h-4 w-4" />
              </MobileTool>
            )}
            <MobileTool label="Settings" onClick={onToggleSettings}>
              <Settings className="h-4 w-4" />
            </MobileTool>
          </div>

          <div className="flex items-center justify-between gap-2 px-1 pb-1 pt-1">
            <DockBtn
              onClick={onToggleAudio}
              label={isAudioEnabled ? 'Mute' : 'Unmute'}
              variant={isAudioEnabled ? 'light' : 'muted'}
            >
              {isAudioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
            </DockBtn>
            <DockBtn
              onClick={onToggleVideo}
              label={isVideoEnabled ? 'Stop video' : 'Start video'}
              variant={isVideoEnabled ? 'light' : 'muted'}
            >
              {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
            </DockBtn>
            <DockBtn onClick={onSwitchCamera} label="Flip camera" variant="light">
              <RotateCcw className="h-6 w-6" />
            </DockBtn>
            {onToggleParticipants && (
              <DockBtn onClick={onToggleParticipants} label="Participants" variant="light">
                <Users className="h-6 w-6" />
              </DockBtn>
            )}
            <DockBtn onClick={onLeaveMeeting} label="Leave call" variant="end">
              <PhoneOff className="h-6 w-6" />
            </DockBtn>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-50 flex justify-center px-2 safe-area-inset-bottom sm:bottom-6">
      <div className="pointer-events-auto max-w-full overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2 px-1 sm:gap-3.5">
          <DockBtn
            onClick={onToggleAudio}
            label={isAudioEnabled ? 'Mute' : 'Unmute'}
            variant={isAudioEnabled ? 'light' : 'muted'}
          >
            {isAudioEnabled ? <Mic className="h-5 w-5 sm:h-6 sm:w-6" /> : <MicOff className="h-5 w-5 sm:h-6 sm:w-6" />}
          </DockBtn>

          <DockBtn
            onClick={onToggleVideo}
            label={isVideoEnabled ? 'Stop video' : 'Start video'}
            variant={isVideoEnabled ? 'light' : 'muted'}
          >
            {isVideoEnabled ? <Video className="h-5 w-5 sm:h-6 sm:w-6" /> : <VideoOff className="h-5 w-5 sm:h-6 sm:w-6" />}
          </DockBtn>

          <DockBtn
            onClick={onToggleScreenShare}
            label={isScreenSharing ? 'Stop sharing' : 'Share screen'}
            variant={isScreenSharing ? 'active' : 'light'}
          >
            {isScreenSharing ? <MonitorOff className="h-5 w-5 sm:h-6 sm:w-6" /> : <Monitor className="h-5 w-5 sm:h-6 sm:w-6" />}
          </DockBtn>

          <DockBtn
            onClick={onToggleHand}
            label={handRaised ? 'Lower hand' : 'Raise hand'}
            variant={handRaised ? 'active' : 'light'}
          >
            <Hand className="h-5 w-5 sm:h-6 sm:w-6" />
          </DockBtn>

          <DockBtn onClick={onToggleSettings} label="Settings" variant="light">
            <Settings className="h-5 w-5 sm:h-6 sm:w-6" />
          </DockBtn>
          <DockBtn
            onClick={onToggleChat}
            label={showChat ? 'Close chat' : 'Open chat'}
            variant={showChat ? 'active' : 'light'}
            pressed={showChat}
          >
            <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />
          </DockBtn>

          {onToggleBrief && (
            <DockBtn
              onClick={onToggleBrief}
              label="Regal Brief"
              variant={showBrief ? 'active' : 'light'}
              pressed={showBrief}
            >
              <ListTodo className="h-5 w-5 sm:h-6 sm:w-6" />
            </DockBtn>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className={cn(circle, light)} aria-label="More options">
                <MoreVertical className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="center"
              className="border-white/10 bg-black/90 text-white backdrop-blur-xl"
            >
              <DropdownMenuItem onClick={onToggleCaptions}>
                {captionsEnabled ? <CaptionsOff className="mr-2 h-4 w-4" /> : <Captions className="mr-2 h-4 w-4" />}
                Captions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSwitchCamera}>
                <RotateCcw className="mr-2 h-4 w-4" /> Flip camera
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleEffects}>
                <Sparkles className="mr-2 h-4 w-4" /> Visual effects
              </DropdownMenuItem>
              {onToggleBrief && (
                <DropdownMenuItem onClick={onToggleBrief}>
                  <ListTodo className="mr-2 h-4 w-4" /> Regal Brief
                </DropdownMenuItem>
              )}
              {onNavigateToDashboard && (
                <DropdownMenuItem onClick={onNavigateToDashboard}>
                  <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DockBtn onClick={onLeaveMeeting} label="Leave call" variant="end">
            <PhoneOff className="h-5 w-5 sm:h-6 sm:w-6" />
          </DockBtn>
        </div>
      </div>
    </div>
  );
};
