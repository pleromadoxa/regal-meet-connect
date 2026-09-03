import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Home, LayoutDashboard, LogIn } from 'lucide-react';
import { Footer } from '@/components/Footer';
import { LandingBackground } from '@/components/landing/LandingBackground';
import { RegalAppHeader } from '@/components/layout/RegalAppHeader';
import { PRODUCT_NAME } from '@/constants/site';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth } from '@/hooks/useAuth';
import logo from '@/assets/regal-logo.png';

const NotFound = () => {
  const location = useLocation();
  const { user } = useAuth();

  useDocumentTitle('Page not found');

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.warn('404:', location.pathname);
    }
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen-safe flex-col overflow-x-clip bg-[#0a0a0a] text-white">
      <LandingBackground />
      <RegalAppHeader user={user} showSettingsLink={Boolean(user)} />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-8 text-center safe-area-inset-top safe-area-inset-bottom">
        <img src={logo} alt={PRODUCT_NAME} className="mb-6 h-16 w-16 drop-shadow-[0_0_24px_rgba(255,107,53,0.4)]" />
        <p className="mb-2 select-none text-7xl font-bold text-white/10">404</p>
        <h1 className="mb-3 text-2xl font-bold md:text-3xl">Page not found</h1>
        <p className="mb-8 max-w-md text-white/50">
          The page <code className="text-orange-300/90">{location.pathname}</code> doesn&apos;t exist
          or may have moved.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="premium" className="shadow-[0_0_24px_rgba(255,107,53,0.25)]">
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Home
            </Link>
          </Button>
          {user && (
            <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
              <Link to="/dashboard">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </Button>
          )}
          {!user && (
            <Button asChild variant="ghost" className="text-white/70 hover:bg-white/10 hover:text-white">
              <Link to="/auth">
                <LogIn className="mr-2 h-4 w-4" />
                Sign in
              </Link>
            </Button>
          )}
        </div>
      </main>

      <Footer className="relative z-10 border-white/10 bg-transparent" isAuthenticated={Boolean(user)} />
    </div>
  );
};

export default NotFound;
