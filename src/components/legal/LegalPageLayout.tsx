import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Footer } from '@/components/Footer';
import { PRODUCT_NAME } from '@/constants/site';
import logo from '@/assets/regal-logo.png';

interface LegalPageLayoutProps {
  title: string;
  children: ReactNode;
}

export const LegalPageLayout = ({ title, children }: LegalPageLayoutProps) => (
  <div className="min-h-screen-safe flex flex-col bg-gradient-to-br from-[#0a0612] via-[#0d0818] to-[#160a26] text-white">
    <header className="container mx-auto px-4 py-6 sm:px-6 safe-area-inset-top">
      <div className="flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logo} alt="" className="h-9 w-9 rounded-lg" />
          <span className="font-bold">{PRODUCT_NAME}</span>
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>
      </div>
    </header>

    <main className="container mx-auto flex-1 px-4 pb-12 sm:px-6 max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-white/45">Last updated: June 2026</p>
      <div className="prose prose-invert mt-8 max-w-none space-y-6 text-white/75 prose-headings:text-white prose-a:text-orange-400">
        {children}
      </div>
    </main>

    <Footer className="border-white/10" />
  </div>
);
