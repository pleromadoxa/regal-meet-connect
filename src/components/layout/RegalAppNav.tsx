import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { APP_NAV_ITEMS } from '@/constants/navigation';

interface RegalAppNavProps {
  className?: string;
  size?: 'sm' | 'md';
  isAuthenticated?: boolean;
}

export const RegalAppNav = ({
  className,
  size = 'md',
  isAuthenticated = false,
}: RegalAppNavProps) => {
  const location = useLocation();

  const items = APP_NAV_ITEMS.filter((item) => !item.requiresAuth || isAuthenticated);

  return (
    <nav
      className={cn(
        'inline-flex items-center rounded-full border border-white/10 bg-black/30 p-1 backdrop-blur-md',
        size === 'sm' ? 'gap-0.5' : 'gap-1',
        className
      )}
      aria-label="App navigation"
    >
      {items.map((item) => {
        const isActive = item.exact
          ? location.pathname === item.path
          : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'inline-flex min-h-[44px] items-center rounded-full font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 touch-target',
              size === 'sm' ? 'px-3 py-2 text-xs' : 'px-3.5 py-2.5 text-sm',
              isActive
                ? 'bg-orange-500 text-white shadow-[0_0_20px_rgba(255,107,53,0.3)]'
                : 'text-white/55 hover:bg-white/5 hover:text-white'
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
};
