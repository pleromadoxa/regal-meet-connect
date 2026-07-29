import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Globe2,
  Play,
  ShieldCheck,
  Sparkles,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { COMPANY_NAME } from '@/constants/site';
import heroImage from '@/assets/hero-conference.png';
import { QuickJoinSection } from '@/components/landing/QuickJoinSection';

interface LandingHeroProps {
  user: unknown;
  onJoinMeeting: (name: string, roomId: string) => void;
}

const TRUST_PILLS = [
  { icon: Video, label: 'HD video & audio' },
  { icon: ShieldCheck, label: 'TLS-encrypted' },
  { icon: Globe2, label: 'Join from anywhere' },
];

export const LandingHero = ({ user, onJoinMeeting }: LandingHeroProps) => {
  const navigate = useNavigate();

  return (
    <section className="relative mx-auto max-w-7xl px-4 pb-8 pt-8 sm:px-6 sm:pt-12 md:pt-14 lg:px-8 lg:pb-16">
      <div className="grid items-center gap-10 md:grid-cols-2 md:gap-12 lg:gap-14 xl:gap-20">
        {/* Copy */}
        <div className="text-center md:text-left">
          <div
            className="landing-fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-orange-500/25 bg-orange-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-orange-200/90"
            style={{ animationDelay: '0.05s' }}
          >
            <Sparkles className="h-3.5 w-3.5 text-orange-400" />
            {COMPANY_NAME}
          </div>

          <h1
            className="landing-fade-up text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-[2.75rem] lg:text-6xl xl:text-[3.65rem]"
            style={{ animationDelay: '0.1s' }}
          >
            Meetings that feel
            <span className="landing-text-gradient block sm:inline">
              {' '}
              regal
            </span>
            <span className="block text-white/90">— not routine.</span>
          </h1>

          <p
            className="landing-fade-up mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/55 sm:text-lg md:mx-0"
            style={{ animationDelay: '0.18s' }}
          >
            Crystal-clear HD calls, live captions, screen sharing, and host-controlled lobbies.
            Powered by PalaceGate · Regal Firewall.
          </p>

          <div
            className="landing-fade-up mt-8 flex flex-col items-center gap-3 sm:flex-row md:justify-start"
            style={{ animationDelay: '0.26s' }}
          >
            <Button
              variant="premium"
              size="lg"
              className="h-12 w-full min-w-[200px] rounded-xl px-8 text-base shadow-[0_0_40px_rgba(255,107,53,0.35)] sm:w-auto"
              onClick={() => document.getElementById('join')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <Play className="h-4 w-4 fill-current" />
              Join a meeting
            </Button>
            {!user && (
              <Button
                variant="glass"
                size="lg"
                className="h-12 w-full rounded-xl border-white/15 text-white sm:w-auto"
                onClick={() => navigate('/auth')}
              >
                Create free account
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          <ul
            className="landing-fade-up mt-10 flex flex-wrap items-center justify-center gap-2 md:justify-start"
            style={{ animationDelay: '0.34s' }}
          >
            {TRUST_PILLS.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-white/70 backdrop-blur-sm"
              >
                <Icon className="h-3.5 w-3.5 text-orange-400" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        {/* Visual + quick join */}
          <div className="relative landing-fade-up md:max-w-xl md:justify-self-end lg:max-w-none" style={{ animationDelay: '0.2s' }}>
          <div className="landing-hero-glow absolute -inset-4 rounded-[2rem] opacity-80 blur-2xl" />

          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/[0.03] p-1.5 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-sm">
            <div className="relative overflow-hidden rounded-[1.35rem]">
              <img
                src={heroImage}
                alt="Team on a Regal Meeting video call"
                className="aspect-[4/3] w-full object-cover object-center"
                loading="eager"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0612] via-[#0a0612]/20 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
                <span className="rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
                  Live captions
                </span>
                <span className="rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
                  Screen share
                </span>
                <span className="rounded-lg border border-orange-500/30 bg-orange-500/20 px-3 py-1.5 text-xs font-semibold text-orange-100 backdrop-blur-md">
                  Host lobby
                </span>
              </div>
            </div>
          </div>

          {/* Floating accent card */}
          <div className="absolute -left-2 top-8 hidden rounded-xl border border-white/10 bg-[#120a1f]/90 px-4 py-3 shadow-xl backdrop-blur-xl md:block lg:-left-8">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Latency</p>
            <p className="text-lg font-bold text-emerald-400">Ultra-low</p>
          </div>
          <div className="absolute -right-1 bottom-24 hidden rounded-xl border border-white/10 bg-[#120a1f]/90 px-4 py-3 shadow-xl backdrop-blur-xl md:block lg:-right-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Quality</p>
            <p className="text-lg font-bold text-orange-400">Up to HD</p>
          </div>
        </div>
      </div>

      <div id="join" className="mt-16 scroll-mt-28 sm:mt-20">
        <QuickJoinSection onJoinMeeting={onJoinMeeting} variant="landing" />
      </div>
    </section>
  );
};
