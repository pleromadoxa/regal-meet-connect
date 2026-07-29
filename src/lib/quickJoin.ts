import { parseMeetingCodeFromInput } from '@/lib/meeting';

export function normalizeMeetingCodeInput(raw: string): string {
  return parseMeetingCodeFromInput(raw);
}

export function isPlausibleMeetingCode(raw: string): boolean {
  const code = normalizeMeetingCodeInput(raw);
  return code.length >= 4;
}
