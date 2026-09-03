import type { ReactNode } from 'react';
import { Footer } from '@/components/Footer';
import { LandingBackground } from '@/components/landing/LandingBackground';
import { RegalAppHeader } from '@/components/layout/RegalAppHeader';
import type { RegalProduct } from '@/constants/site';
import type { User } from '@supabase/supabase-js';
import { cn } from '@/lib/utils';

type ProfileLike = {
  display_name?: string | null;
  avatar_url?: string | null;
} | null;

interface RegalAppShellProps {
  activeProduct?: RegalProduct;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  headerActions?: ReactNode;
  secondaryRow?: ReactNode;
  user?: User | null;
  profile?: ProfileLike;
  onSignOut?: () => void;
  showSettingsLink?: boolean;
  showAppNav?: boolean;
  maxWidthClass?: string;
  className?: string;
}

export const RegalAppShell = ({
  activeProduct = 'meeting',
  title,
  subtitle,
  children,
  headerActions,
  secondaryRow,
  user,
  profile,
  onSignOut,
  showSettingsLink = true,
  showAppNav = true,
  maxWidthClass = 'max-w-4xl',
  className,
}: RegalAppShellProps) => (
  <div className={cn('flex min-h-screen-safe flex-col bg-[#0a0a0a] text-white', className)}>
    <LandingBackground />

    <RegalAppHeader
      title={title}
      subtitle={subtitle}
      activeProduct={activeProduct}
      user={user}
      profile={profile}
      onSignOut={onSignOut}
      headerActions={headerActions}
      secondaryRow={secondaryRow}
      showAppNav={showAppNav}
      showSettingsLink={showSettingsLink}
    />

    <main className={cn('relative z-10 mx-auto w-full flex-1 px-4 py-6 sm:px-6', maxWidthClass)}>
      {children}
    </main>

    <Footer className="relative z-10 border-white/10 bg-transparent" isAuthenticated={Boolean(user)} />
  </div>
);
