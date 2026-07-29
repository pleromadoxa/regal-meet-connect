import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function normalizePlan(raw: string | null | undefined): string {
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

type PlanResolution = {
  regal_plan: string;
  status: string;
  current_period_end: string | null;
  plan_source: string | null;
  plan_updated_at: string | null;
  paystack_customer_id: string | null;
  paystack_subscription_id: string | null;
};

async function resolvePlanForUser(
  userId: string,
  email: string,
  meta: Record<string, unknown>,
  regalAdmin: ReturnType<typeof createClient> | null
): Promise<PlanResolution> {
  let metadataPlan = normalizePlan(
    typeof meta.regal_plan === 'string' ? meta.regal_plan : undefined
  );

  let tablePlan: string | null = null;
  let status = 'active';
  let currentPeriodEnd: string | null = null;
  let planSource: string | null =
    typeof meta.regal_plan_source === 'string' ? meta.regal_plan_source : null;
  let paystackCustomerId: string | null = null;
  let paystackSubscriptionId: string | null = null;

  const regalMailUserId = typeof meta.regal_mail_id === 'string' ? meta.regal_mail_id : userId;
  const normalizedEmail = email.toLowerCase();

  if (regalAdmin) {
    const { data: subRow } = await regalAdmin
      .from('regal_subscriptions')
      .select(
        'regal_plan, status, current_period_end, paystack_customer_id, paystack_subscription_id, updated_at'
      )
      .or(`user_id.eq.${regalMailUserId},email.eq.${normalizedEmail}`)
      .maybeSingle();

    if (subRow) {
      tablePlan = normalizePlan(subRow.regal_plan);
      status = typeof subRow.status === 'string' ? subRow.status : 'active';
      currentPeriodEnd = subRow.current_period_end ?? null;
      paystackCustomerId = subRow.paystack_customer_id ?? null;
      paystackSubscriptionId = subRow.paystack_subscription_id ?? null;
      if (!planSource) planSource = 'regal_subscriptions';
    }

    if (regalMailUserId) {
      const { data: regalUser } = await regalAdmin.auth.admin.getUserById(regalMailUserId);
      const regalMeta = (regalUser.user?.user_metadata ?? {}) as Record<string, unknown>;
      const mailMetaPlan = normalizePlan(
        typeof regalMeta.regal_plan === 'string' ? regalMeta.regal_plan : undefined
      );
      if (mailMetaPlan !== 'free' && metadataPlan === 'free') {
        metadataPlan = mailMetaPlan;
      }
      if (!tablePlan || tablePlan === 'free') {
        tablePlan = mailMetaPlan;
      }
      if (!planSource && typeof regalMeta.regal_plan_source === 'string') {
        planSource = regalMeta.regal_plan_source;
      }
    }
  }

  const effectivePlan =
    status === 'canceled' || status === 'cancelled' ? metadataPlan : (tablePlan ?? metadataPlan);

  return {
    regal_plan: effectivePlan,
    status,
    current_period_end: currentPeriodEnd,
    plan_source: planSource,
    plan_updated_at:
      typeof meta.regal_plan_updated_at === 'string' ? meta.regal_plan_updated_at : null,
    paystack_customer_id: paystackCustomerId,
    paystack_subscription_id: paystackSubscriptionId,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const meetingUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const meetingAnon = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const meetingServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const regalMailUrl =
    Deno.env.get('REGAL_MAIL_SUPABASE_URL') ?? 'https://xexnwcmqnelgzuqhkvtx.supabase.co';
  const regalMailServiceKey = Deno.env.get('REGAL_MAIL_SERVICE_ROLE_KEY') ?? '';
  const authHeader = req.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ') || !meetingUrl || !meetingAnon) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const meetingClient = createClient(meetingUrl, meetingAnon, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await meetingClient.auth.getUser();
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { for_user_id?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const caller = userData.user;
  let targetUser = caller;

  if (body.for_user_id && body.for_user_id !== caller.id) {
    if (!meetingServiceKey) {
      return new Response(JSON.stringify({ error: 'Host plan lookup unavailable' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const meetingAdmin = createClient(meetingUrl, meetingServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: hostData, error: hostError } = await meetingAdmin.auth.admin.getUserById(
      body.for_user_id
    );
    if (hostError || !hostData.user) {
      return new Response(JSON.stringify({ error: 'Host not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    targetUser = hostData.user;
  }

  const meta = (targetUser.user_metadata ?? {}) as Record<string, unknown>;
  const regalAdmin = regalMailServiceKey
    ? createClient(regalMailUrl, regalMailServiceKey)
    : null;

  const resolved = await resolvePlanForUser(
    targetUser.id,
    targetUser.email ?? '',
    meta,
    regalAdmin
  );

  return new Response(
    JSON.stringify({
      ...resolved,
      paystack_configured: Boolean(Deno.env.get('PAYSTACK_SECRET_KEY')),
      meeting_tier: resolved.regal_plan,
      for_user_id: targetUser.id,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
