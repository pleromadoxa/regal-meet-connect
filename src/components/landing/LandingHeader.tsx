import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PRODUCT_NAME } from '@/constants/site';
import regalLogo from '@/assets/regal-logo.png';

interface LandingHeaderProps {
  user: { email?: string | null } | null;
  onSignOut: () => void;
}

export const LandingHeader = ({ user, onSignOut }: LandingHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 safe-area-inset-top">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.35)] sm:mt-4 sm:px-4 sm:py-3 md:gap-4">
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-lg outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-orange-500/50"
          >
            <img
              src={regalLogo}
              alt={PRODUCT_NAME}
              className="h-9 w-9 rounded-lg shadow-[0_0_24px_rgba(255,107,53,0.35)]"
            />
            <span className="text-lg font-bold tracking-tight text-white sm:text-xl">{PRODUCT_NAME}</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            <a
              href="#features"
              className="rounded-lg px-3 py-2 text-sm font-medium text-white/60 transition-colors hover:text-white"
            >
              Features
            </a>
            <a
              href="#join"
              className="rounded-lg px-3 py-2 text-sm font-medium text-white/60 transition-colors hover:text-white"
            >
              Join
            </a>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden text-white/80 hover:bg-white/10 hover:text-white md:inline-flex"
                  onClick={() => navigate('/dashboard')}
                >
                  Dashboard
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                  onClick={onSignOut}
                >
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden text-white/80 hover:bg-white/10 hover:text-white md:inline-flex"
                  onClick={() => navigate('/auth')}
                >
                  Sign in
                </Button>
                <Button variant="premium" size="sm" onClick={() => navigate('/auth')}>
                  Get started
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};
