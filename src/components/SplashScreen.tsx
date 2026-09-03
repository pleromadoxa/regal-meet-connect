import { useEffect, useRef, useState } from 'react';
import logo from '@/assets/regal-logo.png';
import { PRODUCT_NAME } from '@/constants/site';

interface SplashScreenProps {
  onComplete?: () => void;
  /** Total splash duration in ms */
  duration?: number;
}

/**
 * Short branded splash with logo entrance, glow rings, and progress bar.
 */
export const SplashScreen = ({ onComplete, duration = 1400 }: SplashScreenProps) => {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const fadeStart = Math.max(duration - 450, 600);
    const t1 = window.setTimeout(() => setFadeOut(true), fadeStart);
    const t2 = window.setTimeout(() => {
      setVisible(false);
      onCompleteRef.current?.();
    }, duration);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [duration]);

  if (!visible) return null;

  return (
    <div
      className={`splash-screen fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-500 ease-out ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      role="status"
      aria-live="polite"
      aria-label="Loading Regal Meeting"
    >
      <div className="relative flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-40 w-40 items-center justify-center sm:h-44 sm:w-44">
          <div
            className="splash-glow pointer-events-none absolute inset-2 rounded-full bg-orange-500/25 blur-2xl"
            aria-hidden
          />
          <div
            className="splash-ring pointer-events-none absolute inset-0 rounded-full p-[3px]"
            style={{
              background:
                'conic-gradient(from 0deg, transparent 0%, hsl(24 100% 50%) 25%, hsl(280 100% 60%) 50%, transparent 75%)',
            }}
            aria-hidden
          >
            <div className="h-full w-full rounded-full bg-[#0a0612]" />
          </div>
          <div
            className="splash-ring-reverse pointer-events-none absolute inset-3 rounded-full p-[2px] opacity-60"
            style={{
              background:
                'conic-gradient(from 180deg, transparent 0%, hsl(16 85% 55%) 30%, hsl(240 100% 50%) 55%, transparent 80%)',
            }}
            aria-hidden
          >
            <div className="h-full w-full rounded-full bg-[#0a0612]/80" />
          </div>

          <div className="splash-logo-wrap relative z-10 overflow-hidden rounded-2xl">
            <img
              src={logo}
              alt="Regal Meeting"
              className="relative z-10 h-24 w-24 sm:h-28 sm:w-28 drop-shadow-[0_0_32px_rgba(255,107,53,0.55)]"
              width={112}
              height={112}
              decoding="sync"
              fetchPriority="high"
            />
            <div
              className="splash-shimmer pointer-events-none absolute inset-0 z-20 bg-gradient-to-r from-transparent via-white/35 to-transparent"
              aria-hidden
            />
          </div>
          </div>

          <p className="splash-title text-xl font-bold tracking-tight text-white sm:text-2xl">
            {PRODUCT_NAME}
          </p>
        </div>

        <div className="flex flex-col items-center">
          <div
            className="h-0.5 w-28 overflow-hidden rounded-full bg-white/10 sm:w-32"
            aria-hidden
          >
            <div className="splash-progress-bar h-full w-full rounded-full bg-gradient-to-r from-orange-500 via-orange-400 to-purple-500" />
          </div>
        </div>
      </div>
    </div>
  );
};
