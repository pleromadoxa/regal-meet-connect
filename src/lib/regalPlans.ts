/**
 * Regal One plans — synced with Regal Cloud `packages/regal-entitlements` and
 * regalmesh.com/regal-one. Billing webhooks: Paystack on Regal Mail Supabase.
 */

export type RegalPlanId =
  | 'free'
  | 'pro'
  | 'vault_plus'
  | 'ultra'
  | 'business_education'
  | 'business_corporate'
  | 'team';

export const REGAL_ONE_SITE_URL = 'https://regalmesh.com/regal-one';
export const REGAL_ONE_DASHBOARD_URL = 'https://regalmesh.com/dashboard';
export const REGAL_BUSINESS_EMAIL = 'business@regalmail.me';

/** Consumer plans with Paystack monthly checkout (USD cents). */
export const PAYSTACK_MONTHLY_USD_CENTS: Partial<Record<RegalPlanId, number>> = {
  pro: 499,
  vault_plus: 1299,
  ultra: 2499,
};

export function normalizeRegalPlan(raw: string | null | undefined): RegalPlanId {
  const v = (raw ?? '').trim().toLowerCase();
  if (v === 'pro') return 'pro';
  if (v === 'vault_plus' || v === 'vault+' || v === 'vaultplus') return 'vault_plus';
  if (v === 'ultra') return 'ultra';
  if (v === 'team' || v === 'teams' || v === 'business_team') return 'team';
  if (v === 'business_education' || v === 'business-education' || v === 'education') {
    return 'business_education';
  }
  if (v === 'business_corporate' || v === 'business-corporate' || v === 'corporate' || v === 'business') {
    return 'business_corporate';
  }
  return 'free';
}

export function regalPlanIdFromMetadata(
  metadata: Record<string, unknown> | undefined
): RegalPlanId {
  const raw = typeof metadata?.regal_plan === 'string' ? metadata.regal_plan : '';
  return normalizeRegalPlan(raw);
}

export function planDisplayName(plan: RegalPlanId): string {
  switch (plan) {
    case 'pro':
      return 'Regal One · Plus';
    case 'vault_plus':
      return 'Regal One · Premium';
    case 'ultra':
      return 'Regal One · Ultra';
    case 'team':
      return 'Regal Cloud · Teams';
    case 'business_education':
      return 'Business · Education';
    case 'business_corporate':
      return 'Business · Corporate';
    default:
      return 'Regal One · Free';
  }
}

export function meetingTierLabel(plan: RegalPlanId): string {
  if (plan === 'vault_plus' || plan === 'ultra' || plan === 'business_corporate') {
    return 'Regal Meeting HD (via Regal One)';
  }
  if (plan === 'pro' || plan === 'business_education') {
    return 'Regal Meeting Plus perks';
  }
  if (plan === 'team') {
    return 'Regal Meeting Business';
  }
  return 'Regal Meeting Basic';
}

export function subscriptionStatusLabel(status: string): string {
  if (status === 'active') return 'Active';
  if (status === 'canceled' || status === 'cancelled') return 'Canceled';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function formatRenewalDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function paystackUpgradeUrl(plan: RegalPlanId = 'pro'): string {
  return `${REGAL_ONE_DASHBOARD_URL}?upgrade=${plan}`;
}
