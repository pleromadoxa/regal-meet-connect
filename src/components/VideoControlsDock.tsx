
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
  priority?: 'high' | 'medium' | 'low';
  isSpecial?: boolean; // For the leave meeting button
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

  // Special styling for leave meeting button
  const buttonSize = item.isSpecial 
    ? 'w-14 h-14 sm:w-16 sm:h-16' 
    : 'w-10 h-10 sm:w-11 sm:h-11';
  
  const iconSize = item.isSpecial ? 24 : 18;

  return (
    <div
      className="relative group"
      onMouseEnter={() => onHover(item.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div
        className={`
          relative flex items-center justify-center
          ${buttonSize} rounded-lg
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
          {React.cloneElement(item.icon as React.ReactElement, { size: iconSize })}
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
        z-50
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

  const allDockItems: DockItem[] = [
    {
      id: 'audio',
      icon: <Mic />,
      label: isAudioEnabled ? 'Mute' : 'Unmute',
      onClick: onToggleAudio,
      isActive: isAudioEnabled,
      variant: isAudioEnabled ? 'success' : 'danger',
      priority: 'high'
    },
    {
      id: 'video',
      icon: isVideoEnabled ? <Video /> : <VideoOff />,
      label: isVideoEnabled ? 'Turn Off Camera' : 'Turn On Camera',
      onClick: onToggleVideo,
      isActive: isVideoEnabled,
      variant: isVideoEnabled ? 'success' : 'danger',
      priority: 'high'
    },
    {
      id: 'screen',
      icon: isScreenSharing ? <MonitorOff /> : <Monitor />,
      label: isScreenSharing ? 'Stop Sharing' : 'Share Screen',
      onClick: onToggleScreenShare,
      isActive: isScreenSharing,
      priority: 'medium'
    },
    {
      id: 'camera-switch',
      icon: <RotateCcw />,
      label: 'Switch Camera',
      onClick: onSwitchCamera,
      priority: 'low'
    },
    {
      id: 'hand',
      icon: <Hand />,
      label: handRaised ? 'Lower Hand' : 'Raise Hand',
      onClick: onToggleHand,
      isActive: handRaised,
      variant: 'warning',
      priority: 'medium'
    },
    {
      id: 'chat',
      icon: <MessageSquare />,
      label: 'Chat',
      onClick: onToggleChat,
      isActive: showChat,
      priority: 'medium'
    },
    {
      id: 'captions',
      icon: <Captions />,
      label: captionsEnabled ? 'Hide Captions' : 'Show Captions',
      onClick: onToggleCaptions,
      isActive: captionsEnabled,
      priority: 'low'
    },
    {
      id: 'settings',
      icon: <Settings />,
      label: 'Settings',
      onClick: onToggleSettings,
      isActive: showSettings,
      priority: 'low'
    }
  ];

  if (onNavigateToDashboard) {
    allDockItems.push({
      id: 'dashboard',
      icon: <LayoutDashboard />,
      label: 'Dashboard',
      onClick: onNavigateToDashboard,
      priority: 'low'
    });
  }

  // Special leave meeting button with larger size and centered position
  allDockItems.push({
    id: 'leave',
    icon: <Phone className="rotate-135" />,
    label: 'Leave Meeting',
    onClick: onLeaveMeeting,
    variant: 'danger',
    priority: 'high',
    isSpecial: true
  });

  // For mobile, show only high priority items first, then medium
  const mobileItems = allDockItems.filter(item => item.priority === 'high');
  const tabletItems = allDockItems.filter(item => item.priority !== 'low');

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-[95vw] flex justify-center">
      <div className="relative">
        {/* Mobile Dock - Show only essential controls */}
        <div className={`
          sm:hidden flex items-center justify-center gap-3 px-4 py-3
          rounded-2xl
          bg-black/40 backdrop-blur-xl
          border border-white/10
          shadow-2xl
          transition-all duration-500 ease-out
          ${hoveredItem ? 'scale-105' : ''}
        `}>
          {mobileItems.map((item) => (
            <DockItemComponent
              key={item.id}
              item={item}
              isHovered={hoveredItem === item.id}
              onHover={setHoveredItem}
            />
          ))}
        </div>

        {/* Tablet Dock - Show more controls */}
        <div className={`
          hidden sm:flex md:hidden items-center justify-center gap-3 px-5 py-3
          rounded-2xl
          bg-black/40 backdrop-blur-xl
          border border-white/10
          shadow-2xl
          transition-all duration-500 ease-out
          ${hoveredItem ? 'scale-105' : ''}
        `}>
          {tabletItems.map((item) => (
            <DockItemComponent
              key={item.id}
              item={item}
              isHovered={hoveredItem === item.id}
              onHover={setHoveredItem}
            />
          ))}
        </div>

        {/* Desktop Dock - Show all controls */}
        <div className={`
          hidden md:flex items-center justify-center gap-4 px-6 py-4
          rounded-2xl
          bg-black/40 backdrop-blur-xl
          border border-white/10
          shadow-2xl
          transition-all duration-500 ease-out
          ${hoveredItem ? 'scale-105' : ''}
        `}>
          {allDockItems.map((item) => (
            <DockItemComponent
              key={item.id}
              item={item}
              isHovered={hoveredItem === item.id}
              onHover={setHoveredItem}
            />
          ))}
        </div>
        
        {/* Reflection Effect */}
        <div className="absolute top-full left-0 right-0 h-6 sm:h-8 overflow-hidden opacity-30">
          <div className={`
            flex items-start justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-2
            rounded-2xl
            bg-black/20 backdrop-blur-xl
            border border-white/5
            transform scale-y-[-1]
            transition-all duration-500 ease-out
            ${hoveredItem ? 'scale-105 scale-y-[-1.05]' : ''}
          `}>
            {(window.innerWidth < 640 ? mobileItems : window.innerWidth < 768 ? tabletItems : allDockItems).map((item) => (
              <div
                key={`reflection-${item.id}`}
                className={`
                  flex items-center justify-center
                  ${item.isSpecial ? 'w-14 h-14 sm:w-16 sm:h-16' : 'w-10 h-10 sm:w-11 sm:h-11'} rounded-lg
                  bg-white/5
                  transition-all duration-300 ease-out
                  ${hoveredItem === item.id 
                    ? 'scale-110 -translate-y-1' 
                    : ''
                  }
                `}
              >
                <div className="text-white/30">
                  {React.cloneElement(item.icon as React.ReactElement, { 
                    size: item.isSpecial ? 24 : 18 
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
