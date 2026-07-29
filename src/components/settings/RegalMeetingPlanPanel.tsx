import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRegalSubscription } from '@/hooks/useRegalSubscription';
import { formatDurationLimit } from '@/lib/meetingPlanLimits';
import {
  formatRenewalDate,
  meetingTierLabel,
  PAYSTACK_MONTHLY_USD_CENTS,
  planDisplayName,
  paystackUpgradeUrl,
  REGAL_ONE_SITE_URL,
  subscriptionStatusLabel,
} from '@/lib/regalPlans';
import { ExternalLink, Loader2, RefreshCw, Sparkles } from 'lucide-react';

export function RegalMeetingPlanPanel() {
  const {
    plan,
    limits,
    status,
    current_period_end,
    plan_source,
    paystack_configured,
    paystack_subscription_id,
    loading,
    refresh,
    isPaid,
  } = useRegalSubscription();

  const renewal = formatRenewalDate(current_period_end);
  const plusPrice = PAYSTACK_MONTHLY_USD_CENTS.pro
    ? `$${(PAYSTACK_MONTHLY_USD_CENTS.pro / 100).toFixed(2)}/mo`
    : null;

  return (
    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg text-white">
            <Sparkles className="h-5 w-5 text-orange-400" />
            Regal One plan
          </CardTitle>
          <p className="mt-1 text-sm text-white/60">
            Meeting limits sync with your Regal Mail / Paystack subscription on Regal Cloud.
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => void refresh()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-border/50 bg-background/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Current plan</p>
              <p className="text-lg font-semibold">{planDisplayName(plan)}</p>
              <p className="text-sm text-muted-foreground">{meetingTierLabel(plan)}</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-medium">{subscriptionStatusLabel(status)}</p>
              {renewal && <p className="text-muted-foreground">Renews {renewal}</p>}
              {plan_source && (
                <p className="text-xs text-muted-foreground">via {plan_source}</p>
              )}
            </div>
          </div>
        </div>

        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-lg border border-border/40 px-3 py-2">
            <dt className="text-muted-foreground">Participants</dt>
            <dd className="font-medium">Up to {limits.maxParticipants}</dd>
          </div>
          <div className="rounded-lg border border-border/40 px-3 py-2">
            <dt className="text-muted-foreground">Session length</dt>
            <dd className="font-medium">{formatDurationLimit(limits.maxDurationMinutes)}</dd>
          </div>
          <div className="rounded-lg border border-border/40 px-3 py-2">
            <dt className="text-muted-foreground">Video quality</dt>
            <dd className="font-medium">
              {limits.hdVideo ? `HD up to ${limits.maxVideoHeight}p` : 'Standard (480p)'}
            </dd>
          </div>
          <div className="rounded-lg border border-border/40 px-3 py-2">
            <dt className="text-muted-foreground">Large meetings (50+)</dt>
            <dd className="font-medium">{limits.sfuEnabled ? 'Cloudflare SFU' : 'Not included'}</dd>
          </div>
        </dl>

        {paystack_subscription_id && (
          <p className="text-xs text-muted-foreground">
            Paystack subscription active — renewals update automatically via webhook.
          </p>
        )}

        {!isPaid && (
          <div className="rounded-xl border border-orange-500/25 bg-orange-500/10 p-4 text-sm">
            <p className="font-medium text-orange-100">Upgrade for HD & longer meetings</p>
            <p className="mt-1 text-orange-100/80">
              Regal One · Plus includes HD video, extended duration
              {plusPrice ? ` (${plusPrice})` : ''}, and priority across Regal Meeting, Mail, and
              Cloud.
            </p>
            <Button asChild className="mt-3" size="sm">
              <a href={paystackUpgradeUrl('pro')} target="_blank" rel="noopener noreferrer">
                Upgrade on Regal One
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={REGAL_ONE_SITE_URL} target="_blank" rel="noopener noreferrer">
              Compare all plans
              <ExternalLink className="ml-2 h-3.5 w-3.5" />
            </a>
          </Button>
          {!paystack_configured && (
            <p className="text-xs text-muted-foreground self-center">
              Paystack billing is managed on regalmesh.com
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
