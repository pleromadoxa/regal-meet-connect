import { CalendarDays, Camera, Shield, Sparkles, Users, Zap } from 'lucide-react';
import { CALENDAR_PRODUCT_NAME, PRODUCT_NAME, type RegalProduct } from '@/constants/site';

const MEETING_FEATURES = [
  { icon: Camera, label: 'HD video & audio' },
  { icon: Shield, label: 'Enterprise security' },
  { icon: Zap, label: 'Instant meetings' },
  { icon: Users, label: 'Host controls' },
] as const;

const CALENDAR_FEATURES = [
  { icon: CalendarDays, label: 'Week & day views' },
  { icon: Users, label: 'Team scheduling' },
  { icon: Sparkles, label: 'Meeting sync' },
  { icon: Shield, label: 'Shared calendars' },
] as const;

/** Compact product highlights for mobile auth layout */
export const AuthHeroStrip = ({ product = 'meeting' }: { product?: RegalProduct }) => {
  const isCalendar = product === 'calendar';
  const features = isCalendar ? CALENDAR_FEATURES : MEETING_FEATURES;
  const productName = isCalendar ? CALENDAR_PRODUCT_NAME : PRODUCT_NAME;

  return (
    <div className="mt-8 lg:hidden" aria-hidden>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-400/80 sm:text-xs">
        {productName}
      </p>
      <h2 className="mt-2 text-xl font-bold leading-tight text-white sm:text-2xl">
        {isCalendar ? 'Your team calendar, built in.' : 'Video collaboration, built for teams.'}
      </h2>
      <ul className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-3">
        {features.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 backdrop-blur-sm sm:px-3.5"
          >
            <Icon className="h-4 w-4 shrink-0 text-orange-400" aria-hidden />
            <span className="text-xs font-medium leading-tight text-white/85 sm:text-sm">{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
