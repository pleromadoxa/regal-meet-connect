import { Camera, Globe, Shield, Zap } from 'lucide-react';
import { COMPANY_NAME } from '@/constants/site';

const FEATURES = [
  { icon: Shield, label: 'Enterprise Security', iconClass: 'text-emerald-400' },
  { icon: Zap, label: 'Lightning Fast', iconClass: 'text-orange-400' },
  { icon: Globe, label: 'Global Network', iconClass: 'text-blue-400' },
  { icon: Camera, label: 'HD Video & Audio', iconClass: 'text-purple-400' },
] as const;

/** Compact hero for phones and iPad portrait — full hero panel shows from lg (landscape) */
export const AuthHeroStrip = () => (
  <div
    className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm sm:p-6 lg:hidden"
    aria-hidden
  >
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-400/80 sm:text-xs">
      {COMPANY_NAME}
    </p>
    <h2 className="mt-2 text-xl font-bold leading-tight text-white sm:text-2xl">
      Connect with your team anywhere, anytime.
    </h2>
    <ul className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-4">
      {FEATURES.map(({ icon: Icon, label, iconClass }) => (
        <li
          key={label}
          className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 sm:px-3.5"
        >
          <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} aria-hidden />
          <span className="text-xs font-medium leading-tight text-white/85 sm:text-sm">{label}</span>
        </li>
      ))}
    </ul>
  </div>
);
