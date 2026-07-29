import {
  Captions,
  LayoutGrid,
  Lock,
  Mic2,
  MonitorUp,
  Users,
  Zap,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Users,
    title: 'HD video for every seat',
    description: 'Adaptive quality keeps calls sharp on any connection — from boardroom to mobile.',
    className: 'md:col-span-2 md:row-span-1',
    accent: 'from-orange-500/20 to-transparent',
  },
  {
    icon: Lock,
    title: 'Host-controlled lobby',
    description: 'Admit guests one by one. You stay in control of who enters the room.',
    className: 'md:col-span-1',
    accent: 'from-purple-500/20 to-transparent',
  },
  {
    icon: Captions,
    title: 'Live captions',
    description: 'Real-time transcription so everyone follows along — inclusivity built in.',
    className: 'md:col-span-1',
    accent: 'from-blue-500/15 to-transparent',
  },
  {
    icon: MonitorUp,
    title: 'Screen sharing',
    description: 'Present decks, demos, and documents without leaving the call.',
    className: 'md:col-span-1',
    accent: 'from-pink-500/15 to-transparent',
  },
  {
    icon: Mic2,
    title: 'Studio-grade audio',
    description: 'Noise-aware routing and device pickers for crisp voice on every platform.',
    className: 'md:col-span-1',
    accent: 'from-emerald-500/15 to-transparent',
  },
  {
    icon: Zap,
    title: 'Instant join',
    description: 'No downloads. Open a link, enter your name, and you are in — web or mobile.',
    className: 'md:col-span-2',
    accent: 'from-orange-500/15 via-purple-500/10 to-transparent',
  },
];

export const LandingFeatures = () => (
  <section id="features" className="relative mx-auto max-w-7xl scroll-mt-28 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400/90">Why Regal Meeting</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
        Everything teams need.
        <span className="landing-text-gradient"> Nothing they don&apos;t.</span>
      </h2>
      <p className="mt-4 text-base text-white/50 sm:text-lg">
        Built for modern distributed teams — secure, fast, and beautiful on every screen.
      </p>
    </div>

    <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
      {FEATURES.map((feature, i) => (
        <article
          key={feature.title}
          className={`landing-feature-card group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/[0.05] ${feature.className}`}
          style={{ animationDelay: `${i * 0.06}s` }}
        >
          <div
            className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
          />
          <div className="relative">
            <div className="mb-4 inline-flex rounded-xl border border-white/10 bg-white/5 p-3 text-orange-400 shadow-inner">
              <feature.icon className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/50">{feature.description}</p>
          </div>
        </article>
      ))}
    </div>

    <div className="mt-10 flex flex-col items-center justify-center gap-2 px-4 text-center text-sm text-white/40 sm:flex-row sm:gap-3">
      <LayoutGrid className="h-4 w-4 shrink-0" />
      <span className="max-w-xl leading-relaxed">
        Works with Regal Mail sign-in · Mobile app · Shared meeting links
      </span>
    </div>
  </section>
);
