
import { useState } from 'react';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  MonitorOff, 
  Phone, 
  Settings,
  MessageSquare,
  LayoutDashboard,
  Captions,
  RotateCcw,
  Hand
} from 'lucide-react';

interface DockItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isActive?: boolean;
  variant?: 'default' | 'danger' | 'success' | 'warning';
}

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
  onNavigateToDashboard?: () => void;
  onLeaveMeeting: () => void;
}

const DockItemComponent = ({ 
  item, 
  isHovered, 
  onHover 
}: { 
  item: DockItem; 
  isHovered: boolean; 
  onHover: (id: string | null) => void;
}) => {
  const getVariantStyles = (variant?: string, isActive?: boolean) => {
    if (variant === 'danger') {
      return 'bg-red-500/80 border-red-400 text-white hover:bg-red-600';
    }
    if (isActive) {
      if (variant === 'success') return 'bg-green-500/80 border-green-400 text-white';
      if (variant === 'warning') return 'bg-yellow-500/80 border-yellow-400 text-white';
      return 'bg-blue-500/80 border-blue-400 text-white';
    }
    return 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20';
  };

  return (
    <div
      className="relative group"
      onMouseEnter={() => onHover(item.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div
        className={`
          relative flex items-center justify-center
          w-11 h-11 rounded-lg
          backdrop-blur-[2px]
          border
          transition-all duration-300 ease-out
          cursor-pointer
          shadow-lg
          ${getVariantStyles(item.variant, item.isActive)}
          ${isHovered 
            ? 'scale-110 -translate-y-1 shadow-lg shadow-white/10' 
            : 'hover:scale-105 hover:-translate-y-0.5'
          }
        `}
        onClick={item.onClick}
        style={{
          boxShadow: isHovered
            ? '0 4px 24px 0 rgba(255,255,255,0.08)'
            : undefined,
          transitionProperty: 'box-shadow, transform, background, border-color'
        }}
      >
        <div className={`
          transition-all duration-300
          ${isHovered ? 'scale-105 drop-shadow-[0_1px_4px_rgba(255,255,255,0.10)]' : ''}
        `}>
          {item.icon}
        </div>
      </div>
      
      {/* Tooltip */}
      <div className={`
        absolute -top-10 left-1/2 transform -translate-x-1/2
        px-2.5 py-1 rounded-md
        bg-black/70 backdrop-blur
        text-white text-xs font-normal
        border border-white/5
        transition-all duration-200
        pointer-events-none
        whitespace-nowrap
        ${isHovered 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-1'
        }
        shadow-sm
      `}>
        {item.label}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2">
          <div className="w-2 h-2 bg-black/70 rotate-45 border-r border-b border-white/5"></div>
        </div>
      </div>
    </div>
  );
};

export const VideoControlsDock = ({
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
  captionsEnabled,
  showSettings,
  showChat,
  handRaised,
  onToggleVideo,
  onToggleAudio,
  onToggleScreenShare,
  onSwitchCamera,
  onToggleCaptions,
  onToggleSettings,
  onToggleChat,
  onToggleHand,
  onNavigateToDashboard,
  onLeaveMeeting
}: VideoControlsDockProps) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const dockItems: DockItem[] = [
    {
      id: 'audio',
      icon: isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />,
      label: isAudioEnabled ? 'Mute' : 'Unmute',
      onClick: onToggleAudio,
      isActive: isAudioEnabled,
      variant: isAudioEnabled ? 'success' : 'danger'
    },
    {
      id: 'video',
      icon: isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />,
      label: isVideoEnabled ? 'Turn Off Camera' : 'Turn On Camera',
      onClick: onToggleVideo,
      isActive: isVideoEnabled,
      variant: isVideoEnabled ? 'success' : 'danger'
    },
    {
      id: 'screen',
      icon: isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />,
      label: isScreenSharing ? 'Stop Sharing' : 'Share Screen',
      onClick: onToggleScreenShare,
      isActive: isScreenSharing
    },
    {
      id: 'camera-switch',
      icon: <RotateCcw size={20} />,
      label: 'Switch Camera',
      onClick: onSwitchCamera
    },
    {
      id: 'hand',
      icon: <Hand size={20} />,
      label: handRaised ? 'Lower Hand' : 'Raise Hand',
      onClick: onToggleHand,
      isActive: handRaised,
      variant: 'warning'
    },
    {
      id: 'chat',
      icon: <MessageSquare size={20} />,
      label: 'Chat',
      onClick: onToggleChat,
      isActive: showChat
    },
    {
      id: 'captions',
      icon: <Captions size={20} />,
      label: captionsEnabled ? 'Hide Captions' : 'Show Captions',
      onClick: onToggleCaptions,
      isActive: captionsEnabled
    },
    {
      id: 'settings',
      icon: <Settings size={20} />,
      label: 'Settings',
      onClick: onToggleSettings,
      isActive: showSettings
    }
  ];

  if (onNavigateToDashboard) {
    dockItems.push({
      id: 'dashboard',
      icon: <LayoutDashboard size={20} />,
      label: 'Dashboard',
      onClick: onNavigateToDashboard
    });
  }

  dockItems.push({
    id: 'leave',
    icon: <Phone size={20} className="rotate-135" />,
    label: 'Leave Meeting',
    onClick: onLeaveMeeting,
    variant: 'danger'
  });

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="relative">
        {/* Dock Container */}
        <div className={`
          flex items-end gap-3 px-6 py-4
          rounded-2xl
          bg-black/40 backdrop-blur-xl
          border border-white/10
          shadow-2xl
          transition-all duration-500 ease-out
          ${hoveredItem ? 'scale-105' : ''}
        `}>
          {dockItems.map((item) => (
            <DockItemComponent
              key={item.id}
              item={item}
              isHovered={hoveredItem === item.id}
              onHover={setHoveredItem}
            />
          ))}
        </div>
        
        {/* Reflection Effect */}
        <div className="absolute top-full left-0 right-0 h-8 overflow-hidden opacity-30">
          <div className={`
            flex items-start gap-3 px-6 py-2
            rounded-2xl
            bg-black/20 backdrop-blur-xl
            border border-white/5
            transform scale-y-[-1]
            transition-all duration-500 ease-out
            ${hoveredItem ? 'scale-105 scale-y-[-1.05]' : ''}
          `}>
            {dockItems.map((item) => (
              <div
                key={`reflection-${item.id}`}
                className={`
                  flex items-center justify-center
                  w-11 h-11 rounded-lg
                  bg-white/5
                  transition-all duration-300 ease-out
                  ${hoveredItem === item.id 
                    ? 'scale-110 -translate-y-1' 
                    : ''
                  }
                `}
              >
                <div className="text-white/30">
                  {item.icon}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
