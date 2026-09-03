import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { COMPANY_NAME, PRODUCT_NAME } from '@/constants/site';
import { EmailCtaBar } from '@/components/landing/EmailCtaBar';
import { MeetingAppPreview } from '@/components/landing/MeetingAppPreview';
import { QuickJoinSection } from '@/components/landing/QuickJoinSection';

interface MeetingLandingHeroProps {
  user: unknown;
  onJoinMeeting: (name: string, roomId: string) => void;
}

export const MeetingLandingHero = ({ user, onJoinMeeting }: MeetingLandingHeroProps) => {
  const navigate = useNavigate();

  return (
    <>
      <section className="relative mx-auto max-w-5xl px-4 pt-10 text-center sm:px-6 sm:pt-14 md:pt-20 lg:px-8">
        <div
          className="landing-fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/[0.08] px-4 py-1.5 text-xs font-medium text-orange-200/90 transition-colors hover:border-orange-500/35"
          style={{ animationDelay: '0.05s' }}
        >
          <Sparkles className="h-3.5 w-3.5 text-orange-400" />
          {COMPANY_NAME} · Now in public beta
          <ArrowRight className="h-3 w-3 opacity-60" />
        </div>

        <h1
          className="landing-fade-up text-4xl font-extrabold leading-[1.06] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-[4.25rem]"
          style={{ animationDelay: '0.1s' }}
        >
          The next generation
          <br />
          of <span className="landing-text-gradient">video collaboration.</span>
        </h1>

        <p
          className="landing-fade-up mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/50 sm:text-lg md:mt-6"
          style={{ animationDelay: '0.18s' }}
        >
          {PRODUCT_NAME} is one central hub for HD calls, live captions, screen sharing, and
          host-controlled lobbies — so your team can work closely together from anywhere.
        </p>

        {!user ? (
          <EmailCtaBar buttonLabel="Start free trial" />
        ) : (
          <div
            className="landing-fade-up mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ animationDelay: '0.28s' }}
          >
            <Button
              variant="premium"
              size="lg"
              className="h-12 min-w-[200px] rounded-xl shadow-[0_0_40px_rgba(255,107,53,0.35)]"
              onClick={() => navigate('/dashboard')}
            >
              Open dashboard
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 min-w-[200px] rounded-xl border-white/15 bg-white/5 text-white hover:bg-white/10"
              onClick={() => document.getElementById('join')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Join a meeting
            </Button>
          </div>
        )}

        <MeetingAppPreview />
      </section>

      <div id="join" className="relative mx-auto max-w-4xl scroll-mt-28 px-4 pb-8 pt-4 sm:px-6 lg:px-8">
        <QuickJoinSection onJoinMeeting={onJoinMeeting} variant="landing" />
      </div>
    </>
  );
};
