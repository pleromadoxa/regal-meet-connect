import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  Settings, MessageSquare, Hand, Sparkles, RotateCcw,
  Captions, CaptionsOff, PhoneOff, LayoutDashboard,
  MoreVertical, Smile, Users
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
 * Google Meet-style control dock.
 * Round pill buttons on a translucent dark surface, distinct red end-call button.
 * On mobile: 5 essential buttons + a "More" sheet.
 */
export const VideoControlsDock = ({
  isVideoEnabled, isAudioEnabled, isScreenSharing, captionsEnabled,
  showChat, handRaised,
  onToggleVideo, onToggleAudio, onToggleScreenShare, onSwitchCamera,
  onToggleCaptions, onToggleSettings, onToggleChat, onToggleHand, onToggleEffects,
  onNavigateToDashboard, onLeaveMeeting, onToggleParticipants,
}: VideoControlsDockProps) => {
  const isMobile = useIsMobile();

  const pill = "h-12 w-12 rounded-full flex items-center justify-center transition-all duration-150 active:scale-95";
  const baseOn = "bg-white/10 hover:bg-white/20 text-white border border-white/10";
  const baseOff = "bg-red-500/90 hover:bg-red-500 text-white border border-red-400/40";
  const accent = "bg-white/10 hover:bg-white/20 text-white border border-white/10";
  const accentActive = "bg-blue-500/90 hover:bg-blue-500 text-white border border-blue-400/40";

  const Btn = ({ onClick, active, children, label, danger = false, off = false }: any) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        pill,
        danger ? "h-12 w-16 rounded-full bg-red-600 hover:bg-red-500 text-white" :
        off ? baseOff :
        active ? accentActive : baseOn
      )}
    >
      {children}
    </button>
  );

  const moreItems = (
    <>
      <DropdownMenuItem onClick={onSwitchCamera}>
        <RotateCcw className="h-4 w-4 mr-2" /> Flip camera
      </DropdownMenuItem>
      <DropdownMenuItem onClick={onToggleEffects}>
        <Sparkles className="h-4 w-4 mr-2" /> Visual effects
      </DropdownMenuItem>
      <DropdownMenuItem onClick={onToggleSettings}>
        <Settings className="h-4 w-4 mr-2" /> Device settings
      </DropdownMenuItem>
      {onNavigateToDashboard && (
        <DropdownMenuItem onClick={onNavigateToDashboard}>
          <LayoutDashboard className="h-4 w-4 mr-2" /> Dashboard
        </DropdownMenuItem>
      )}
    </>
  );

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 px-2 w-full max-w-[100vw] flex justify-center">
      <div className="bg-[#202124]/95 backdrop-blur-xl rounded-full px-3 py-2 flex items-center gap-2 shadow-2xl border border-white/5 overflow-x-auto scrollbar-hide max-w-[calc(100vw-1rem)]">
        {/* Mic */}
        <Btn onClick={onToggleAudio} off={!isAudioEnabled} label={isAudioEnabled ? 'Mute' : 'Unmute'}>
          {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </Btn>

        {/* Camera */}
        <Btn onClick={onToggleVideo} off={!isVideoEnabled} label={isVideoEnabled ? 'Stop video' : 'Start video'}>
          {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </Btn>

        {/* Captions */}
        <Btn onClick={onToggleCaptions} active={captionsEnabled} label="Captions">
          {captionsEnabled ? <Captions className="h-5 w-5" /> : <CaptionsOff className="h-5 w-5" />}
        </Btn>

        {!isMobile && (
          <>
            {/* Reactions = effects shortcut for emoji */}
            <Btn onClick={onToggleEffects} label="Reactions">
              <Smile className="h-5 w-5" />
            </Btn>

            {/* Raise hand */}
            <Btn onClick={onToggleHand} active={handRaised} label="Raise hand">
              <Hand className="h-5 w-5" />
            </Btn>

            {/* Screen share */}
            <Btn onClick={onToggleScreenShare} active={isScreenSharing} label="Present">
              {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
            </Btn>
          </>
        )}

        {/* Participants */}
        {onToggleParticipants && (
          <Btn onClick={onToggleParticipants} label="People">
            <Users className="h-5 w-5" />
          </Btn>
        )}

        {/* Chat */}
        <Btn onClick={onToggleChat} active={showChat} label="Chat">
          <MessageSquare className="h-5 w-5" />
        </Btn>

        {/* More */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(pill, accent)} aria-label="More options">
              <MoreVertical className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="bg-[#202124] text-white border-white/10">
            {isMobile && (
              <>
                <DropdownMenuItem onClick={onToggleHand}>
                  <Hand className="h-4 w-4 mr-2" /> {handRaised ? 'Lower hand' : 'Raise hand'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onToggleScreenShare}>
                  <Monitor className="h-4 w-4 mr-2" /> {isScreenSharing ? 'Stop sharing' : 'Present'}
                </DropdownMenuItem>
              </>
            )}
            {moreItems}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-8 bg-white/10 mx-1" />

        {/* End call */}
        <Btn onClick={onLeaveMeeting} danger label="Leave call">
          <PhoneOff className="h-5 w-5" />
        </Btn>
      </div>
    </div>
  );
};
