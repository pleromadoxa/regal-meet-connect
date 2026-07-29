import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRegalSubscription } from '@/hooks/useRegalSubscription';
import type { MeetingPlanLimits } from '@/lib/meetingPlanLimits';
import { fetchPlanLimitsForUser } from '@/services/regalSubscription';

/**
 * Meeting limits follow the host's Regal One plan. Guests resolve the host plan
 * via the meeting-billing edge function; hosts use their own subscription.
 */
export function useMeetingPlanContext(hostUserId: string | null | undefined) {
  const { user } = useAuth();
  const subscription = useRegalSubscription();
  const [hostLimits, setHostLimits] = useState<MeetingPlanLimits | null>(null);
  const [hostPlanLoading, setHostPlanLoading] = useState(false);

  const isOwnMeeting = Boolean(hostUserId && user?.id && hostUserId === user.id);

  useEffect(() => {
    if (!hostUserId || isOwnMeeting) {
      setHostLimits(null);
      return;
    }

    let cancelled = false;
    setHostPlanLoading(true);
    void fetchPlanLimitsForUser(hostUserId)
      .then((limits) => {
        if (!cancelled) setHostLimits(limits);
      })
      .finally(() => {
        if (!cancelled) setHostPlanLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hostUserId, isOwnMeeting]);

  const limits = hostLimits ?? subscription.limits;

  return {
    ...subscription,
    limits,
    hostLimits,
    planLoading: subscription.loading || hostPlanLoading,
  };
}