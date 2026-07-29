export type RegalMailSupabaseProfile = {
  fullName: string;
  phone: string;
  regalPrefix: string;
  email: string;
};

export function humanizeRegalPrefix(prefix: string): string {
  const cleaned = prefix.trim();
  if (!cleaned) return '';

  return cleaned
    .replace(/[._-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function extractRegalMailProfileFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
  email: string
): RegalMailSupabaseProfile {
  const meta = metadata ?? {};
  const localPart = email.split('@')[0] || '';
  const regalPrefix =
    (typeof meta.regal_prefix === 'string' && meta.regal_prefix.trim()) || localPart;

  const fullName =
    (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta.name === 'string' && meta.name.trim()) ||
    (typeof meta.display_name === 'string' && meta.display_name.trim()) ||
    humanizeRegalPrefix(regalPrefix) ||
    localPart;

  const phone =
    (typeof meta.regal_phone_e164 === 'string' && meta.regal_phone_e164.trim()) ||
    (typeof meta.phone === 'string' && meta.phone.trim()) ||
    '';

  return { fullName, phone, regalPrefix, email };
}
