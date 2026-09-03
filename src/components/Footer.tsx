import { Link } from 'react-router-dom';
import logo from '@/assets/regal-logo.png';
import { PRODUCT_NAME, COMPANY_NAME, COMPANY_LEGAL_NAME } from '@/constants/site';
import { FOOTER_NAV_ITEMS } from '@/constants/navigation';
import { cn } from '@/lib/utils';

interface FooterProps {
  className?: string;
  isAuthenticated?: boolean;
}

export const Footer = ({ className = '', isAuthenticated = false }: FooterProps) => {
  const navItems = FOOTER_NAV_ITEMS.filter((item) => !item.requiresAuth || isAuthenticated);

  return (
    <footer
      className={cn(
        'container mx-auto border-t border-slate-700/40 px-4 py-8 safe-area-inset-bottom sm:px-6 md:py-12',
        className
      )}
    >
      <div className="space-y-4 text-center">
        <div className="mb-4 flex items-center justify-center space-x-2">
          <img src={logo} alt={PRODUCT_NAME} className="h-7 w-7 md:h-8 md:w-8" />
          <span className="text-lg font-bold text-white md:text-xl">{PRODUCT_NAME}</span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="text-white/50 transition-colors hover:text-white"
            >
              {item.label}
            </Link>
          ))}
          <a
            href="https://regalmesh.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/50 transition-colors hover:text-white"
          >
            {COMPANY_NAME}
          </a>
        </nav>
        <p className="text-sm text-slate-400 md:text-base">
          © {new Date().getFullYear()} {COMPANY_LEGAL_NAME}. All rights reserved.
        </p>
        <p className="text-sm text-slate-400/80">
          {PRODUCT_NAME} — connecting people across the globe.
        </p>
        <p className="text-xs text-slate-600">Powered by PalaceGate · Regal Firewall</p>
      </div>
    </footer>
  );
};
