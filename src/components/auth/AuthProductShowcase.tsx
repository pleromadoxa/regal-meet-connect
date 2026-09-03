import { CalendarDays, Camera, Shield, Sparkles, Users, Zap } from 'lucide-react';
import { CalendarAppPreview } from '@/components/landing/CalendarAppPreview';
import { MeetingAppPreview } from '@/components/landing/MeetingAppPreview';
import { CALENDAR_PRODUCT_NAME, COMPANY_NAME, PRODUCT_NAME, type RegalProduct } from '@/constants/site';

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

interface AuthProductShowcaseProps {
  product: RegalProduct;
  className?: string;
}

/** Product preview + highlights for the auth page right panel */
export const AuthProductShowcase = ({ product, className }: AuthProductShowcaseProps) => {
  const isCalendar = product === 'calendar';
  const features = isCalendar ? CALENDAR_FEATURES : MEETING_FEATURES;
  const productName = isCalendar ? CALENDAR_PRODUCT_NAME : PRODUCT_NAME;

  return (
    <div className={className} aria-hidden>
      <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-orange-400/90">
        {COMPANY_NAME}
      </p>
      <h2 className="max-w-lg text-3xl font-bold leading-[1.12] tracking-tight text-white xl:text-4xl">
        {isCalendar ? (
          <>
            Schedule smarter.
            <span className="landing-text-gradient"> Meet faster.</span>
          </>
        ) : (
          <>
            Connect with your team
            <br />
            <span className="landing-text-gradient">anywhere, anytime.</span>
          </>
        )}
      </h2>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-white/50 sm:text-base">
        {isCalendar
          ? `${CALENDAR_PRODUCT_NAME} keeps your team aligned with shared events, smart scheduling, and one-click Regal Meeting links.`
          : `${PRODUCT_NAME} brings HD calls, screen sharing, and host-controlled lobbies together in one workspace.`}
      </p>

      <ul className="mt-6 flex flex-wrap gap-2">
        {features.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-white/70 backdrop-blur-sm"
          >
            <Icon className="h-3.5 w-3.5 text-orange-400" />
            {label}
          </li>
        ))}
      </ul>

      <div className="mt-8">
        {isCalendar ? <CalendarAppPreview /> : <MeetingAppPreview />}
      </div>

      <p className="mt-4 text-center text-xs text-white/35">
        One {COMPANY_NAME} account for {productName} and more.
      </p>
    </div>
  );
};
