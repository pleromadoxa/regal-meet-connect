const KEY = 'regal_mail_magic_link_sent_at';
const COOLDOWN_MS = 60_000;

export function canSendRegalMailMagicLink(): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return true;
    const sentAt = Number(raw);
    if (!Number.isFinite(sentAt)) return true;
    return Date.now() - sentAt >= COOLDOWN_MS;
  } catch {
    return true;
  }
}

export function markRegalMailMagicLinkSent(): void {
  try {
    localStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function regalMailMagicLinkCooldownSeconds(): number {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return 0;
    const sentAt = Number(raw);
    if (!Number.isFinite(sentAt)) return 0;
    const remaining = COOLDOWN_MS - (Date.now() - sentAt);
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  } catch {
    return 0;
  }
}
