import { supabase } from '@/integrations/supabase/client';
import {
  normalizeRegalPlan,
  regalPlanIdFromMetadata,
  type RegalPlanId,
} from '@/lib/regalPlans';
import { meetingLimitsForPlan, type MeetingPlanLimits } from '@/lib/meetingPlanLimits';

export type RegalSubscriptionSnapshot = {
  regal_plan: RegalPlanId;
  status: string;
  current_period_end: string | null;
  plan_source: string | null;
  plan_updated_at: string | null;
  paystack_configured: boolean;
  paystack_customer_id: string | null;
  paystack_subscription_id: string | null;
  limits: MeetingPlanLimits;
};

export function subscriptionFromUserMetadata(
  metadata: Record<string, unknown> | undefined
): RegalSubscriptionSnapshot {
  const plan = regalPlanIdFromMetadata(metadata);
  return {
    regal_plan: plan,
    status: 'active',
    current_period_end: null,
    plan_source:
      typeof metadata?.regal_plan_source === 'string' ? metadata.regal_plan_source : null,
    plan_updated_at:
      typeof metadata?.regal_plan_updated_at === 'string' ? metadata.regal_plan_updated_at : null,
    paystack_configured: false,
    paystack_customer_id: null,
    paystack_subscription_id: null,
    limits: meetingLimitsForPlan(plan),
  };
}

export async function fetchRegalSubscriptionSnapshot(): Promise<RegalSubscriptionSnapshot> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const fallback = subscriptionFromUserMetadata(
    user?.user_metadata as Record<string, unknown> | undefined
  );

  if (!user) return fallback;

  try {
    const { data, error } = await supabase.functions.invoke('meeting-billing', {
      body: {},
    });

    if (error || !data || data.error) {
      return fallback;
    }

    const plan = normalizeRegalPlan(data.regal_plan);
    return {
      regal_plan: plan,
      status: typeof data.status === 'string' ? data.status : 'active',
      current_period_end: data.current_period_end ?? null,
      plan_source: data.plan_source ?? fallback.plan_source,
      plan_updated_at: data.plan_updated_at ?? fallback.plan_updated_at,
      paystack_configured: Boolean(data.paystack_configured),
      paystack_customer_id: data.paystack_customer_id ?? null,
      paystack_subscription_id: data.paystack_subscription_id ?? null,
      limits: meetingLimitsForPlan(plan),
    };
  } catch {
    return fallback;
  }
}

export async function fetchPlanLimitsForUser(userId: string): Promise<MeetingPlanLimits> {
  try {
    const { data, error } = await supabase.functions.invoke('meeting-billing', {
      body: { for_user_id: userId },
    });

    if (error || !data || data.error) {
      return meetingLimitsForPlan('free');
    }

    return meetingLimitsForPlan(normalizeRegalPlan(data.regal_plan));
  } catch {
    return meetingLimitsForPlan('free');
  }
}
