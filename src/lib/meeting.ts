import { SITE_URL } from '@/constants/site';

/** Shared meeting code charset — excludes ambiguous I/O/0/1 for readability */
export const MEETING_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const MEETING_CODE_LENGTH = 8;

export function generateMeetingCode(): string {
  let out = '';
  for (let i = 0; i < MEETING_CODE_LENGTH; i++) {
    out += MEETING_CODE_CHARS[Math.floor(Math.random() * MEETING_CODE_CHARS.length)];
  }
  return out;
}

/** @deprecated use generateMeetingCode */
export const generateMeetingId = generateMeetingCode;

/** Extract a meeting code from a raw code, URL, or deep link. */
export function parseMeetingCodeFromInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/\/meeting\/([A-Za-z0-9-]+)/i);
    if (match?.[1]) return match[1].toUpperCase();
  } catch {
    /* not a URL */
  }

  const schemeMatch = trimmed.match(/(?:regalmeet:\/\/)?meeting\/([A-Za-z0-9-]+)/i);
  if (schemeMatch?.[1]) return schemeMatch[1].toUpperCase();

  return trimmed.toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

export function buildJoinLink(code: string): string {
  const base = SITE_URL.replace(/\/$/, '');
  return `${base}/join/${code}`;
}

export function buildMeetingLink(code: string): string {
  const base = SITE_URL.replace(/\/$/, '');
  return `${base}/meeting/${code}`;
}

export function isEncryptedCallCode(code: string): boolean {
  return code.toUpperCase().startsWith('CALL-');
}
