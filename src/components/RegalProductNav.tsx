import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { REGAL_PRODUCTS, type RegalProduct } from '@/constants/site';

interface RegalProductNavProps {
  active?: RegalProduct;
  className?: string;
  size?: 'sm' | 'md';
}

export const RegalProductNav = ({ active, className, size = 'md' }: RegalProductNavProps) => {
  const location = useLocation();
  const resolvedActive: RegalProduct =
    active ?? (location.pathname.startsWith('/calendar') ? 'calendar' : 'meeting');

  return (
    <nav
      className={cn(
        'inline-flex items-center rounded-full border border-white/10 bg-black/30 p-1 backdrop-blur-md',
        size === 'sm' ? 'gap-0.5' : 'gap-1',
        className
      )}
      aria-label="Regal products"
    >
      {REGAL_PRODUCTS.map((product) => {
        const isActive = resolvedActive === product.id;
        return (
          <Link
            key={product.id}
            to={product.path}
            className={cn(
              'rounded-full font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50',
              size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
              isActive
                ? 'bg-orange-500 text-white shadow-[0_0_24px_rgba(255,107,53,0.35)]'
                : 'text-white/55 hover:bg-white/5 hover:text-white'
            )}
          >
            {product.label}
          </Link>
        );
      })}
    </nav>
  );
};
