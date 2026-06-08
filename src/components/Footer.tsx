import React from 'react';
import logo from '@/assets/regal-logo.png';

interface FooterProps {
  className?: string;
}

export const Footer = ({ className = "" }: FooterProps) => {
  return (
    <footer className={`container mx-auto px-4 py-8 md:py-12 border-t border-slate-700/40 safe-area-inset-bottom ${className}`}>
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <img src={logo} alt="Regal Meet" className="h-7 w-7 md:h-8 md:w-8" />
          <span className="text-lg md:text-xl font-bold text-white">Regal Meet</span>
        </div>
        <p className="text-slate-400 text-sm md:text-base">
          © {new Date().getFullYear()} Regal Meet. Connecting people across the globe. all rights reserved Regal Network Technologies.
        </p>
        <p className="text-slate-600 text-xs">
          Powered By PalaceGate by Regal Firewall
        </p>
      </div>
    </footer>
  );
};