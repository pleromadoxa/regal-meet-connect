import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchRegalSubscriptionSnapshot,
  subscriptionFromUserMetadata,
  type RegalSubscriptionSnapshot,
} from '@/services/regalSubscription';

export function useRegalSubscription() {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<RegalSubscriptionSnapshot>(() =>
    subscriptionFromUserMetadata(user?.user_metadata as Record<string, unknown> | undefined)
  );
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const next = await fetchRegalSubscriptionSnapshot();
      setSnapshot(next);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh, user?.id]);

  useEffect(() => {
    if (!user) return;
    setSnapshot(subscriptionFromUserMetadata(user.user_metadata as Record<string, unknown>));
  }, [user?.user_metadata, user]);

  return {
    ...snapshot,
    plan: snapshot.regal_plan,
    limits: snapshot.limits,
    loading,
    refresh,
    isPaid: snapshot.regal_plan !== 'free' && snapshot.status === 'active',
    isSubscriptionActive: snapshot.status === 'active',
  };
}
