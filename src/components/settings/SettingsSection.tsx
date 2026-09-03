import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

interface SettingsSectionProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}

export const settingsCardClass =
  'overflow-hidden border-white/10 bg-white/[0.03] backdrop-blur-xl';

export const settingsInputClass =
  'h-11 rounded-xl border-white/12 bg-[#111111] text-white placeholder:text-white/30 focus-visible:ring-orange-500/40';

export const SettingsSection = ({
  title,
  description,
  icon: Icon,
  children,
  className,
}: SettingsSectionProps) => (
  <Card className={`${settingsCardClass} ${className ?? ''}`}>
    <CardHeader className="border-b border-white/[0.06] pb-4">
      <div className="flex items-start gap-3">
        {Icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-orange-500/25 bg-orange-500/10 text-orange-400">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <div>
          <CardTitle className="text-lg text-white">{title}</CardTitle>
          {description && <p className="mt-1 text-sm text-white/50">{description}</p>}
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-5 pt-6">{children}</CardContent>
  </Card>
);

interface SettingsToggleRowProps {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}

export const SettingsToggleRow = ({
  title,
  description,
  checked,
  onCheckedChange,
}: SettingsToggleRowProps) => (
  <div className="flex items-start justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5">
    <div>
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="mt-0.5 text-xs text-white/50">{description}</p>
    </div>
    <Switch checked={checked} onCheckedChange={onCheckedChange} />
  </div>
);
