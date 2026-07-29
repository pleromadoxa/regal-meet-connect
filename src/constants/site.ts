/** Production site URL — set VITE_SITE_URL at build time for Cloudflare Pages */
export const SITE_URL =
  (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') ||
  (typeof window !== 'undefined' ? window.location.origin : 'https://meet.regalmesh.com');

export const MEET_DOMAIN = 'meet.regalmesh.com';

export const PRODUCT_NAME = 'Regal Meeting' as const;
export const COMPANY_NAME = 'Quantum Regal' as const;

export function appOrigin(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  return SITE_URL;
}

/** Safe internal redirect path (prevents open redirects). */
export function sanitizeRedirectPath(path: string | null | undefined, fallback = '/dashboard'): string {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return fallback;
  return path;
}
