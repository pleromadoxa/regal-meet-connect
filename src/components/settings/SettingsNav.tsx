import type { LucideIcon } from 'lucide-react';
import { SETTINGS_TABS, type SettingsTabId } from '@/constants/navigation';
import { cn } from '@/lib/utils';

interface SettingsNavProps {
  active: SettingsTabId;
  onChange: (tab: SettingsTabId) => void;
  className?: string;
}

const TabButton = ({
  active,
  onClick,
  icon: Icon,
  label,
  description,
  layout,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  description: string;
  layout: 'sidebar' | 'mobile';
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex w-full items-start gap-3 rounded-xl border text-left transition-all duration-200',
      layout === 'sidebar' ? 'px-4 py-3.5' : 'shrink-0 px-3.5 py-2.5',
      active
        ? 'border-orange-500/40 bg-orange-500/15 shadow-[0_0_20px_rgba(255,107,53,0.15)]'
        : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
    )}
  >
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg border',
        layout === 'sidebar' ? 'h-9 w-9' : 'h-8 w-8',
        active
          ? 'border-orange-500/30 bg-orange-500/20 text-orange-300'
          : 'border-white/10 bg-black/20 text-white/55'
      )}
    >
      <Icon className={layout === 'sidebar' ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
    </span>
    <span className="min-w-0">
      <span className={cn('block font-semibold', active ? 'text-white' : 'text-white/85')}>
        {label}
      </span>
      {layout === 'sidebar' && (
        <span className="mt-0.5 block text-xs text-white/45">{description}</span>
      )}
    </span>
  </button>
);

export const SettingsNav = ({ active, onChange, className }: SettingsNavProps) => (
  <div className={cn('space-y-4', className)}>
    <div className="hidden lg:block">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-orange-400/80">
        Settings
      </p>
      <nav className="flex flex-col gap-2" aria-label="Settings sections">
        {SETTINGS_TABS.map((tab) => (
          <TabButton
            key={tab.id}
            active={active === tab.id}
            onClick={() => onChange(tab.id)}
            icon={tab.icon}
            label={tab.label}
            description={tab.description}
            layout="sidebar"
          />
        ))}
      </nav>
    </div>

    <div className="lg:hidden">
      <nav
        className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Settings sections"
      >
        {SETTINGS_TABS.map((tab) => (
          <TabButton
            key={tab.id}
            active={active === tab.id}
            onClick={() => onChange(tab.id)}
            icon={tab.icon}
            label={tab.label}
            description={tab.description}
            layout="mobile"
          />
        ))}
      </nav>
    </div>
  </div>
);
