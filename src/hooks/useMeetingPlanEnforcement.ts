import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { MeetingPlanLimits } from '@/lib/meetingPlanLimits';
import { formatDurationLimit } from '@/lib/meetingPlanLimits';
import { paystackUpgradeUrl, REGAL_ONE_SITE_URL } from '@/lib/regalPlans';

export function useMeetingDurationLimit(
  limits: MeetingPlanLimits,
  isPaid: boolean,
  meetingStartedAt: number | null
) {
  const { toast } = useToast();
  const warnedRef = useRef(false);

  useEffect(() => {
    if (!meetingStartedAt || limits.maxDurationMinutes == null) return;

    const maxMs = limits.maxDurationMinutes * 60 * 1000;
    const warnAt = meetingStartedAt + maxMs - 5 * 60 * 1000;

    const warnTimer = setTimeout(() => {
      if (warnedRef.current) return;
      warnedRef.current = true;
      toast({
        title: 'Meeting time limit approaching',
        description: isPaid
          ? `Your plan allows ${formatDurationLimit(limits.maxDurationMinutes)} per session.`
          : `Free meetings end after ${formatDurationLimit(limits.maxDurationMinutes)}. Upgrade for longer calls.`,
        duration: 8000,
      });
    }, Math.max(0, warnAt - Date.now()));

    const endTimer = setTimeout(() => {
      toast({
        title: 'Session duration limit reached',
        description: isPaid
          ? 'Start a new meeting to continue.'
          : `Upgrade at ${REGAL_ONE_SITE_URL} for extended duration.`,
        variant: 'destructive',
        duration: 12000,
      });
    }, Math.max(0, meetingStartedAt + maxMs - Date.now()));

    return () => {
      clearTimeout(warnTimer);
      clearTimeout(endTimer);
    };
  }, [meetingStartedAt, limits.maxDurationMinutes, isPaid, toast]);
}

export function participantLimitMessage(current: number, max: number): string | null {
  if (current < max) return null;
  return `Your plan supports up to ${max} participants. Upgrade Regal One for larger meetings.`;
}

export { paystackUpgradeUrl, REGAL_ONE_SITE_URL };
