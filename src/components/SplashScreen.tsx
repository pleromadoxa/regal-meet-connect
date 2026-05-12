import { useEffect, useState } from 'react';
import logo from '@/assets/regal-logo.png';

interface SplashScreenProps {
  onComplete?: () => void;
  duration?: number;
}

/**
 * Brief brand splash shown once on first app mount.
 * Pure CSS animation, no extra deps.
 */
export const SplashScreen = ({ onComplete, duration = 1600 }: SplashScreenProps) => {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFadeOut(true), duration - 400);
    const t2 = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, duration);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [duration, onComplete]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-[#0a0612] via-[#160a26] to-[#1a0d2e] transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      role="status"
      aria-label="Loading Regal Meeting"
    >
      <div className="splash-logo">
        <img
          src={logo}
          alt="Regal Meeting"
          className="h-28 w-28 sm:h-36 sm:w-36 drop-shadow-[0_0_40px_rgba(255,107,53,0.5)]"
        />
      </div>
      <style>{`
        .splash-logo {
          animation: splashIn 900ms cubic-bezier(0.34, 1.56, 0.64, 1) both,
                     splashPulse 1.6s ease-in-out 900ms infinite;
        }
        @keyframes splashIn {
          0%   { transform: scale(0.4); opacity: 0; }
          60%  { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes splashPulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.04); }
        }
      `}</style>
    </div>
  );
};
