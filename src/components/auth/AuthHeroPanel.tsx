import { Camera, Globe, Shield, Zap } from 'lucide-react';
import authHero from '@/assets/auth-hero.png';
import { COMPANY_NAME } from '@/constants/site';

const FEATURES = [
  {
    icon: Shield,
    label: 'Enterprise Security',
    iconClass: 'text-emerald-400',
    boxClass: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    icon: Zap,
    label: 'Lightning Fast',
    iconClass: 'text-orange-400',
    boxClass: 'bg-orange-500/10 border-orange-500/20',
  },
  {
    icon: Globe,
    label: 'Global Network',
    iconClass: 'text-blue-400',
    boxClass: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    icon: Camera,
    label: 'HD Video & Audio',
    iconClass: 'text-purple-400',
    boxClass: 'bg-purple-500/10 border-purple-500/20',
  },
] as const;

/** Right-hand hero on the auth page — illustration, headline, feature grid */
export const AuthHeroPanel = () => (
  <aside
    className="relative hidden min-h-screen-safe flex-1 flex-col overflow-hidden bg-[#0a0612] lg:flex lg:max-w-[55%] xl:max-w-none"
    aria-hidden
  >
    <div className="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-purple-600/20 blur-[100px]" />
    <div className="pointer-events-none absolute -left-16 top-1/3 h-64 w-64 rounded-full bg-orange-500/15 blur-[90px]" />

    <div className="relative flex flex-1 flex-col">
      {/* Illustration — upper area */}
      <div className="relative flex min-h-[36%] flex-1 items-end justify-center px-6 pt-8 lg:min-h-[42%] lg:px-8 lg:pt-10 xl:px-12 xl:pt-14">
        <img
          src={authHero}
          alt=""
          className="relative z-[1] max-h-full w-full max-w-2xl object-contain object-bottom drop-shadow-[0_24px_48px_rgba(0,0,0,0.45)]"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 z-[2] bg-gradient-to-b from-[#0a0612]/30 via-transparent to-[#0a0612]" />
        <div className="absolute inset-0 z-[2] bg-gradient-to-r from-[#0a0612]/80 via-[#0a0612]/20 to-transparent" />
      </div>

      {/* Copy + features — anchored bottom */}
      <div className="relative z-10 shrink-0 px-6 pb-10 pt-4 lg:px-10 lg:pb-12 xl:px-16 xl:pb-16">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-orange-400/80">
          {COMPANY_NAME}
        </p>

        <h2 className="max-w-xl text-3xl font-bold leading-[1.12] tracking-tight text-white lg:text-4xl xl:text-5xl">
          Connect with your team
          <br />
          <span className="text-white/95">anywhere, anytime.</span>
        </h2>

        <p className="mt-4 max-w-lg text-base leading-relaxed text-white/60 xl:text-lg">
          Experience crystal-clear video, seamless collaboration, and enterprise-grade security for
          all your meetings.
        </p>

        <ul className="mt-6 grid max-w-xl grid-cols-2 gap-2.5 lg:mt-8 lg:gap-3">
          {FEATURES.map(({ icon: Icon, label, iconClass, boxClass }) => (
            <li
              key={label}
              className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 backdrop-blur-md transition-all duration-200 hover:border-white/20 hover:bg-white/[0.07]"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${boxClass} transition-transform duration-200 group-hover:scale-105`}
              >
                <Icon className={`h-4 w-4 ${iconClass}`} aria-hidden />
              </span>
              <span className="text-sm font-medium leading-tight text-white/90">{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </aside>
);
