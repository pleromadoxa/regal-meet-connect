import { Link } from 'react-router-dom';
import logo from '@/assets/regal-logo.png';
import { PRODUCT_NAME, COMPANY_NAME, COMPANY_LEGAL_NAME } from '@/constants/site';

interface FooterProps {
  className?: string;
}

export const Footer = ({ className = "" }: FooterProps) => {
  return (
    <footer className={`container mx-auto px-4 sm:px-6 py-8 md:py-12 border-t border-slate-700/40 safe-area-inset-bottom ${className}`}>
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <img src={logo} alt={PRODUCT_NAME} className="h-7 w-7 md:h-8 md:w-8" />
          <span className="text-lg md:text-xl font-bold text-white">{PRODUCT_NAME}</span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
          <Link to="/privacy" className="text-white/50 hover:text-white transition-colors">
            Privacy
          </Link>
          <Link to="/terms" className="text-white/50 hover:text-white transition-colors">
            Terms
          </Link>
          <a
            href="https://regalmesh.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/50 hover:text-white transition-colors"
          >
            {COMPANY_NAME}
          </a>
        </nav>
        <p className="text-slate-400 text-sm md:text-base">
          © {new Date().getFullYear()} {COMPANY_LEGAL_NAME}. All rights reserved.
        </p>
        <p className="text-slate-400/80 text-sm">
          {PRODUCT_NAME} — connecting people across the globe.
        </p>
        <p className="text-slate-600 text-xs">
          Powered by PalaceGate · Regal Firewall
        </p>
      </div>
    </footer>
  );
};
