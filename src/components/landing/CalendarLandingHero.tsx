import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, Sparkles, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CALENDAR_PRODUCT_NAME, COMPANY_NAME } from '@/constants/site';
import { EmailCtaBar } from '@/components/landing/EmailCtaBar';
import { CalendarAppPreview } from '@/components/landing/CalendarAppPreview';

interface CalendarLandingHeroProps {
  user: unknown;
}

const HIGHLIGHTS = [
  { icon: CalendarDays, label: 'Week & day views' },
  { icon: Users, label: 'Team scheduling' },
  { icon: Sparkles, label: 'Meeting sync' },
];

export const CalendarLandingHero = ({ user }: CalendarLandingHeroProps) => {
  const navigate = useNavigate();

  return (
    <section className="relative mx-auto max-w-5xl px-4 pt-10 text-center sm:px-6 sm:pt-14 md:pt-20 lg:px-8">
      <div
        className="landing-fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/[0.08] px-4 py-1.5 text-xs font-medium text-orange-200/90"
        style={{ animationDelay: '0.05s' }}
      >
        <CalendarDays className="h-3.5 w-3.5 text-orange-400" />
        Professional calendar for teams
        <ArrowRight className="h-3 w-3 opacity-60" />
      </div>

      <h1
        className="landing-fade-up text-4xl font-extrabold leading-[1.06] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-[4.25rem]"
        style={{ animationDelay: '0.1s' }}
      >
        The calendar that
        <br />
        <span className="landing-text-gradient">works for your team.</span>
      </h1>

      <p
        className="landing-fade-up mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/50 sm:text-lg md:mt-6"
        style={{ animationDelay: '0.18s' }}
      >
        {CALENDAR_PRODUCT_NAME} helps you schedule, optimize, and protect your day — with shared
        events, meeting links, and collaboration built in. One sign-in with {COMPANY_NAME}.
      </p>

      {!user ? (
        <EmailCtaBar buttonLabel="Request access" redirectTo="/calendar" />
      ) : (
        <div
          className="landing-fade-up mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          style={{ animationDelay: '0.28s' }}
        >
          <Button
            variant="premium"
            size="lg"
            className="h-12 min-w-[200px] rounded-xl shadow-[0_0_40px_rgba(255,107,53,0.35)]"
            onClick={() => navigate('/calendar')}
          >
            Open calendar
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      )}

      <ul
        className="landing-fade-up mt-8 flex flex-wrap items-center justify-center gap-2"
        style={{ animationDelay: '0.32s' }}
      >
        {HIGHLIGHTS.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-white/65 backdrop-blur-sm"
          >
            <Icon className="h-3.5 w-3.5 text-orange-400" />
            {label}
          </li>
        ))}
      </ul>

      <CalendarAppPreview />
    </section>
  );
};
