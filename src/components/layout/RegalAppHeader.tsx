import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Settings } from 'lucide-react';
import regalLogo from '@/assets/regal-logo.png';
import { RegalAppNav } from '@/components/layout/RegalAppNav';
import { RegalProductNav } from '@/components/RegalProductNav';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { Button } from '@/components/ui/button';
import { PRODUCT_NAME, type RegalProduct } from '@/constants/site';
import { resolveAvatarUrl } from '@/lib/profileAvatar';
import type { User } from '@supabase/supabase-js';
import { cn } from '@/lib/utils';

type ProfileLike = {
  display_name?: string | null;
  avatar_url?: string | null;
} | null;

interface RegalAppHeaderProps {
  title?: string;
  subtitle?: string;
  activeProduct?: RegalProduct;
  user?: User | null;
  profile?: ProfileLike;
  onSignOut?: () => void;
  headerActions?: ReactNode;
  secondaryRow?: ReactNode;
  showAppNav?: boolean;
  showSettingsLink?: boolean;
  /** Tighter mobile layout for full-height app surfaces (e.g. calendar). */
  dense?: boolean;
  className?: string;
}

export const RegalAppHeader = ({
  title,
  subtitle,
  activeProduct = 'meeting',
  user,
  profile,
  onSignOut,
  headerActions,
  secondaryRow,
  showAppNav = true,
  showSettingsLink = true,
  dense = false,
  className,
}: RegalAppHeaderProps) => {
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User';
  const avatarUrl = resolveAvatarUrl(profile, user);

  return (
    <header
      className={cn(
        'relative z-10 shrink-0 border-b border-white/[0.06] px-3 safe-area-inset-top sm:px-6',
        dense ? 'py-2 sm:py-3' : 'py-3',
        className
      )}
    >
      <div className={cn('mx-auto flex max-w-[1600px] flex-col', dense ? 'gap-2 sm:gap-3' : 'gap-3')}>
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <Link
              to="/"
              className="flex shrink-0 items-center gap-2.5 rounded-lg outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-orange-500/50"
            >
              <img
                src={regalLogo}
                alt={PRODUCT_NAME}
                className="h-8 w-8 rounded-lg shadow-[0_0_20px_rgba(255,107,53,0.3)] sm:h-9 sm:w-9"
              />
              {title && (
                <span className="hidden truncate text-base font-bold text-white sm:inline sm:text-lg">
                  {title}
                </span>
              )}
            </Link>
            <RegalProductNav active={activeProduct} size="sm" className="hidden xl:inline-flex" />
          </div>

          {showAppNav && (
            <RegalAppNav
              size="sm"
              isAuthenticated={Boolean(user)}
              className="hidden md:inline-flex"
            />
          )}

          <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
            {headerActions}
            {showSettingsLink && user && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-white/60 hover:text-white"
                asChild
              >
                <Link to="/settings" aria-label="Settings">
                  <Settings className="h-4 w-4" />
                </Link>
              </Button>
            )}
            {user && (
              <ProfileAvatar
                avatarUrl={avatarUrl}
                displayName={displayName}
                email={user.email}
                size="sm"
                className="hidden sm:flex"
              />
            )}
            {onSignOut && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-white/60 hover:text-white"
                onClick={onSignOut}
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div
          className={cn(
            'flex flex-col gap-2',
            dense ? 'sm:gap-2 lg:flex-row lg:items-center lg:justify-between' : 'gap-3 lg:flex-row lg:items-center lg:justify-between'
          )}
        >
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex min-w-0 items-center gap-2 overflow-x-auto scrollbar-hide">
              <RegalProductNav active={activeProduct} size="sm" className="shrink-0 xl:hidden" />
              {showAppNav && (
                <RegalAppNav
                  size="sm"
                  isAuthenticated={Boolean(user)}
                  className="shrink-0 md:hidden"
                />
              )}
            </div>
            {(title || subtitle) && (
              <div className={cn('min-w-0', dense ? 'hidden' : 'sm:hidden')}>
                {title && <h1 className="truncate text-lg font-bold">{title}</h1>}
                {subtitle && <p className="truncate text-sm text-white/50">{subtitle}</p>}
              </div>
            )}
          </div>
          {secondaryRow && <div className="min-w-0 w-full lg:w-auto">{secondaryRow}</div>}
        </div>

        {subtitle && (
          <p className="hidden text-sm text-white/50 sm:block">{subtitle}</p>
        )}
      </div>
    </header>
  );
};
