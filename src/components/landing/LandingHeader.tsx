import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RegalAppNav } from '@/components/layout/RegalAppNav';
import { RegalProductNav } from '@/components/RegalProductNav';
import { PRODUCT_NAME } from '@/constants/site';
import regalLogo from '@/assets/regal-logo.png';

interface LandingHeaderProps {
  user: { email?: string | null } | null;
  onSignOut: () => void;
  activeProduct?: 'meeting' | 'calendar';
  variant?: 'default' | 'auth';
}

export const LandingHeader = ({
  user,
  onSignOut,
  activeProduct = 'meeting',
  variant = 'default',
}: LandingHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 safe-area-inset-top">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="mt-3 flex items-center justify-between gap-3 px-1 py-2 sm:mt-5 sm:px-2 md:gap-6">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2.5 rounded-lg outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-orange-500/50"
          >
            <img
              src={regalLogo}
              alt={PRODUCT_NAME}
              className="h-8 w-8 rounded-lg shadow-[0_0_20px_rgba(255,107,53,0.3)] sm:h-9 sm:w-9"
            />
          </Link>

          <RegalProductNav active={activeProduct} className="hidden sm:inline-flex" />

          <RegalAppNav
            isAuthenticated={Boolean(user)}
            size="sm"
            className="hidden lg:inline-flex"
          />

          <div className="flex items-center gap-2 sm:gap-3">
            {variant === 'auth' ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-white/70 hover:bg-white/10 hover:text-white"
                onClick={() => navigate(activeProduct === 'calendar' ? '/calendar' : '/')}
              >
                Back to home
              </Button>
            ) : user ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden text-white/70 hover:bg-white/10 hover:text-white md:inline-flex"
                  onClick={() => navigate(activeProduct === 'calendar' ? '/calendar' : '/dashboard')}
                >
                  {activeProduct === 'calendar' ? 'Open calendar' : 'Dashboard'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/70 hover:bg-white/10 hover:text-white"
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
                  className="hidden text-white/70 hover:bg-white/10 hover:text-white sm:inline-flex"
                  onClick={() => navigate('/auth')}
                >
                  Sign in
                </Button>
                <Button
                  variant="premium"
                  size="sm"
                  className="shadow-[0_0_20px_rgba(255,107,53,0.25)]"
                  onClick={() =>
                    navigate(
                      activeProduct === 'calendar'
                        ? '/auth?mode=signup&redirect=/calendar'
                        : '/auth?mode=signup'
                    )
                  }
                >
                  <span className="hidden sm:inline">Get started</span>
                  <span className="sm:hidden">Start</span>
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </nav>

        <div className="flex flex-col items-center gap-3 pb-3 sm:hidden">
          <RegalProductNav active={activeProduct} size="sm" />
          <RegalAppNav isAuthenticated={Boolean(user)} size="sm" />
        </div>
      </div>
    </header>
  );
};
