import React from 'react';
import { Video } from 'lucide-react';

interface FooterProps {
  className?: string;
}

export const Footer = ({ className = "" }: FooterProps) => {
  return (
    <footer className={`container mx-auto px-4 py-8 md:py-12 border-t border-slate-700/40 safe-area-inset-bottom ${className}`}>
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Video className="h-5 w-5 md:h-6 md:w-6 text-orange-400" />
          <span className="text-lg md:text-xl font-bold text-white">Regal Meet</span>
        </div>
        <p className="text-slate-400 text-sm md:text-base">
          © {new Date().getFullYear()} Regal Meet. Connecting people across the globe.
        </p>
        <p className="text-slate-500 text-xs md:text-sm">
          All rights reserved Regal Network Technologies.
        </p>
        <p className="text-slate-600 text-xs">
          Powered By the LoveWorld Teens and Youth Ministry
        </p>
      </div>
    </footer>
  );
};