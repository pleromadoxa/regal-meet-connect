/** Production site URL — set VITE_SITE_URL at build time for Cloudflare Pages */
export const SITE_URL =
  (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') ||
  (typeof window !== 'undefined' ? window.location.origin : 'https://meet.regalmesh.com');

export const MEET_DOMAIN = 'meet.regalmesh.com';

export const PRODUCT_NAME = 'Regal Meeting' as const;
export const CALENDAR_PRODUCT_NAME = 'Regal Calendar' as const;

export type RegalProduct = 'meeting' | 'calendar';

export const REGAL_PRODUCTS: { id: RegalProduct; label: string; path: string }[] = [
  { id: 'meeting', label: PRODUCT_NAME, path: '/' },
  { id: 'calendar', label: CALENDAR_PRODUCT_NAME, path: '/calendar' },
];

/** Short brand name for UI */
export const COMPANY_NAME = 'Spatial Regal' as const;
/** Full legal entity name */
export const COMPANY_LEGAL_NAME = 'Spatial Regal Digital Ltd' as const;

export function appOrigin(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  return SITE_URL;
}

/** Safe internal redirect path (prevents open redirects). */
export function sanitizeRedirectPath(path: string | null | undefined, fallback = '/dashboard'): string {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return fallback;
  return path;
}
