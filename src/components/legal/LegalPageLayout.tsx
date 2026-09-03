import type { ReactNode } from 'react';
import { Footer } from '@/components/Footer';
import { LandingBackground } from '@/components/landing/LandingBackground';
import { RegalAppHeader } from '@/components/layout/RegalAppHeader';

interface LegalPageLayoutProps {
  title: string;
  children: ReactNode;
}

export const LegalPageLayout = ({ title, children }: LegalPageLayoutProps) => (
  <div className="relative flex min-h-screen-safe flex-col overflow-x-clip bg-[#0a0a0a] text-white">
    <LandingBackground />

    <RegalAppHeader showSettingsLink={false} />

    <main className="relative z-10 container mx-auto max-w-3xl flex-1 px-4 pb-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-white/45">Last updated: June 2026</p>
      <div className="prose prose-invert mt-8 max-w-none space-y-6 text-white/75 prose-headings:text-white prose-a:text-orange-400">
        {children}
      </div>
    </main>

    <Footer className="relative z-10 border-white/10 bg-transparent" />
  </div>
);
