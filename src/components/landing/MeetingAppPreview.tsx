import { Mic, MicOff, MonitorUp, Users, Video } from 'lucide-react';

type PreviewTile = {
  name: string;
  avatar: string;
  speaking?: boolean;
  self?: boolean;
  more?: boolean;
  extraAvatars?: string[];
};

const PREVIEW_TILES: PreviewTile[] = [
  { name: 'Alex', avatar: '/preview-avatars/alex.jpg', speaking: true },
  { name: 'Jordan', avatar: '/preview-avatars/jordan.jpg' },
  { name: 'Sam', avatar: '/preview-avatars/sam.jpg' },
  { name: 'Riley', avatar: '/preview-avatars/riley.jpg' },
  { name: 'You', avatar: '/preview-avatars/you.jpg', self: true },
  {
    name: '+3',
    avatar: '',
    more: true,
    extraAvatars: [
      '/preview-avatars/extra-1.jpg',
      '/preview-avatars/extra-2.jpg',
      '/preview-avatars/extra-3.jpg',
    ],
  },
];

const PreviewParticipantAvatar = ({ src, speaking }: { src: string; speaking?: boolean }) => (
  <>
    <img
      src={src}
      alt=""
      aria-hidden
      className={`absolute inset-0 h-full w-full object-cover object-[center_20%] ${
        speaking ? 'meeting-preview-avatar-speaking' : ''
      }`}
      loading="lazy"
      decoding="async"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />
  </>
);

/** Dark meeting UI mock — Frame.io / Cron peek style */
export const MeetingAppPreview = () => (
  <div className="landing-app-preview landing-fade-up" style={{ animationDelay: '0.35s' }}>
    <div className="landing-app-window">
      {/* Title bar */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <span className="text-xs font-medium text-white/40">Team Standup · Live</span>
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            HD
          </span>
        </div>
      </div>

      {/* Video grid */}
      <div className="grid grid-cols-3 gap-2 p-3 sm:gap-3 sm:p-4">
        {PREVIEW_TILES.map((tile) => (
          <div
            key={tile.name}
            className={`relative aspect-video overflow-hidden rounded-lg border ${
              tile.speaking
                ? 'border-orange-500/50 ring-1 ring-orange-500/30'
                : 'border-white/[0.06]'
            } bg-[#141414]`}
          >
            {tile.more ? (
              <div className="relative flex h-full items-center justify-center bg-gradient-to-br from-[#1a1a2e] to-[#0d0d0d]">
                <div className="flex items-center">
                  {tile.extraAvatars?.map((avatar, index) => (
                    <img
                      key={avatar}
                      src={avatar}
                      alt=""
                      aria-hidden
                      className="h-9 w-9 rounded-full border-2 border-[#141414] object-cover shadow-lg sm:h-10 sm:w-10"
                      style={{ marginLeft: index === 0 ? 0 : '-0.65rem', zIndex: index }}
                      loading="lazy"
                      decoding="async"
                    />
                  ))}
                </div>
                <span className="ml-2 text-sm font-semibold text-white/50">{tile.name}</span>
              </div>
            ) : (
              <>
                <PreviewParticipantAvatar src={tile.avatar} speaking={tile.speaking} />
                <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                  <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white/80 backdrop-blur-sm">
                    {tile.name}
                  </span>
                  {tile.self && (
                    <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[10px] font-medium text-orange-300">
                      Host
                    </span>
                  )}
                </div>
                {tile.speaking && (
                  <div className="absolute bottom-2 right-2 text-orange-400">
                    <Mic className="h-3 w-3" />
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Control bar */}
      <div className="flex items-center justify-center gap-3 border-t border-white/[0.06] px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70">
          <Mic className="h-3.5 w-3.5" />
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70">
          <Video className="h-3.5 w-3.5" />
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70">
          <MonitorUp className="h-3.5 w-3.5" />
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70">
          <Users className="h-3.5 w-3.5" />
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 text-red-400">
          <MicOff className="h-3.5 w-3.5" />
        </div>
      </div>
    </div>
  </div>
);
