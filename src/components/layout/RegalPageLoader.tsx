import { Loader2 } from 'lucide-react';
import { LandingBackground } from '@/components/landing/LandingBackground';
import { cn } from '@/lib/utils';

interface RegalPageLoaderProps {
  message?: string;
  className?: string;
}

export const RegalPageLoader = ({ message, className }: RegalPageLoaderProps) => (
  <div className={cn('relative flex min-h-screen-safe items-center justify-center bg-[#0a0a0a]', className)}>
    <LandingBackground />
    <div className="relative z-10 flex flex-col items-center gap-3 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-orange-400" />
      {message && <p className="text-sm text-white/50">{message}</p>}
    </div>
  </div>
);
