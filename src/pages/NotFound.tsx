import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Home, LayoutDashboard, LogIn } from 'lucide-react';
import logo from '@/assets/regal-logo.png';
import { PRODUCT_NAME } from '@/constants/site';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const NotFound = () => {
  const location = useLocation();

  useDocumentTitle('Page not found');

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.warn('404:', location.pathname);
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen-safe bg-gradient-to-br from-[#0a0612] via-[#160a26] to-[#1a0d2e] flex flex-col items-center justify-center px-4 py-8 text-center safe-area-inset-top safe-area-inset-bottom">
      <img src={logo} alt={PRODUCT_NAME} className="h-16 w-16 mb-6 drop-shadow-[0_0_24px_rgba(255,107,53,0.4)]" />
      <p className="text-7xl font-bold text-white/10 select-none mb-2">404</p>
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">Page not found</h1>
      <p className="text-white/50 max-w-md mb-8">
        The page <code className="text-orange-300/90">{location.pathname}</code> doesn&apos;t exist
        or may have moved.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild className="bg-orange-500 hover:bg-orange-600">
          <Link to="/">
            <Home className="h-4 w-4 mr-2" />
            Home
          </Link>
        </Button>
        <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10">
          <Link to="/dashboard">
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Dashboard
          </Link>
        </Button>
        <Button asChild variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10">
          <Link to="/auth">
            <LogIn className="h-4 w-4 mr-2" />
            Sign in
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
