import { REGAL_MAIL_DOMAIN } from './regalMailProduct';

export { REGAL_MAIL_DOMAIN };

export function isRegalMailEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf('@');
  if (at < 1) return false;
  return normalized.slice(at + 1) === REGAL_MAIL_DOMAIN;
}

export function regalMailRedirectUrl(
  path = '/auth',
  options?: { redirect?: string | null }
): string {
  const params = new URLSearchParams({ provider: 'regal-mail' });
  if (options?.redirect) {
    params.set('redirect', options.redirect);
  }
  const query = params.toString();
  if (typeof window === 'undefined') return `${path}?${query}`;
  return `${window.location.origin}${path}?${query}`;
}

/** Accepts local-part or full @regalmail.me address. */
export function normalizeRegalMailInput(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return '';

  if (!trimmed.includes('@')) {
    const prefix = trimmed.replace(/[^a-z0-9._-]/g, '').replace(/^\.+|\.+$/g, '');
    if (prefix.length < 3) return '';
    return `${prefix}@${REGAL_MAIL_DOMAIN}`;
  }

  const at = trimmed.lastIndexOf('@');
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (!local || domain !== REGAL_MAIL_DOMAIN) return '';
  return `${local}@${REGAL_MAIL_DOMAIN}`;
}
