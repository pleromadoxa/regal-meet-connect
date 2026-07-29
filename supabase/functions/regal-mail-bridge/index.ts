import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const REGAL_MAIL_DOMAIN = 'regalmail.me';

function isRegalMailEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf('@');
  if (at < 1) return false;
  return normalized.slice(at + 1) === REGAL_MAIL_DOMAIN;
}

function humanizeRegalPrefix(prefix: string): string {
  return prefix
    .replace(/[._-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function extractDisplayName(
  metadata: Record<string, unknown> | null | undefined,
  email: string,
): string {
  const meta = metadata ?? {};
  const localPart = email.split('@')[0] || '';
  const regalPrefix =
    (typeof meta.regal_prefix === 'string' && meta.regal_prefix.trim()) || localPart;

  return (
    (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta.name === 'string' && meta.name.trim()) ||
    (typeof meta.display_name === 'string' && meta.display_name.trim()) ||
    humanizeRegalPrefix(regalPrefix) ||
    localPart
  );
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

  try {
    const meetingUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const meetingServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const regalMailUrl =
      Deno.env.get('REGAL_MAIL_SUPABASE_URL') ?? 'https://xexnwcmqnelgzuqhkvtx.supabase.co';
    const regalMailServiceKey = Deno.env.get('REGAL_MAIL_SERVICE_ROLE_KEY') ?? '';

    if (!meetingUrl || !meetingServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Meeting auth is not configured on the server.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!regalMailServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Regal Mail SSO is not configured. Set REGAL_MAIL_SERVICE_ROLE_KEY.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { accessToken } = await req.json() as { accessToken?: string };
    if (!accessToken?.trim()) {
      return new Response(JSON.stringify({ error: 'accessToken is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const regalClient = createClient(regalMailUrl, regalMailServiceKey);
    const { data: regalData, error: regalError } = await regalClient.auth.getUser(accessToken);

    if (regalError || !regalData.user?.email) {
      return new Response(JSON.stringify({ error: 'Invalid or expired Regal Mail session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const email = regalData.user.email.toLowerCase();
    if (!isRegalMailEmail(email)) {
      return new Response(JSON.stringify({ error: 'Email is not a Regal Mail address' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const displayName = extractDisplayName(
      regalData.user.user_metadata as Record<string, unknown>,
      email,
    );

    const meetingAdmin = createClient(meetingUrl, meetingServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: listed, error: listError } = await meetingAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    let meetingUser = listed.users.find((u) => u.email?.toLowerCase() === email);

    const regalMeta = regalData.user.user_metadata as Record<string, unknown> | undefined;
    const regalPlan =
      typeof regalMeta?.regal_plan === 'string' ? regalMeta.regal_plan : 'free';
    const regalPlanSource =
      typeof regalMeta?.regal_plan_source === 'string' ? regalMeta.regal_plan_source : 'regal-mail';
    const regalPlanUpdatedAt =
      typeof regalMeta?.regal_plan_updated_at === 'string'
        ? regalMeta.regal_plan_updated_at
        : new Date().toISOString();

    if (!meetingUser) {
      const { data: created, error: createError } = await meetingAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          display_name: displayName,
          auth_provider: 'regal-mail',
          regal_mail_id: regalData.user.id,
          regal_plan: regalPlan,
          regal_plan_source: regalPlanSource,
          regal_plan_updated_at: regalPlanUpdatedAt,
        },
      });
      if (createError) throw createError;
      meetingUser = created.user;
    } else {
      await meetingAdmin.auth.admin.updateUserById(meetingUser.id, {
        user_metadata: {
          ...(meetingUser.user_metadata ?? {}),
          display_name: displayName,
          auth_provider: 'regal-mail',
          regal_mail_id: regalData.user.id,
          regal_plan: regalPlan,
          regal_plan_source: regalPlanSource,
          regal_plan_updated_at: regalPlanUpdatedAt,
        },
      });
    }

    if (!meetingUser?.id) {
      throw new Error('Could not resolve meeting user');
    }

    await meetingAdmin.from('profiles').upsert({
      id: meetingUser.id,
      display_name: displayName,
    });

    const { data: linkData, error: linkError } = await meetingAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (linkError) throw linkError;

    const tokenHash =
      linkData.properties?.hashed_token ??
      (linkData as { hashed_token?: string }).hashed_token;

    if (!tokenHash) {
      throw new Error('Could not generate meeting session');
    }

    return new Response(
      JSON.stringify({
        email,
        token_hash: tokenHash,
        authProvider: 'regal-mail',
        profile: { fullName: displayName, email },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('[regal-mail-bridge]', error);
    return new Response(
      JSON.stringify({
        error: 'Could not complete Regal Mail sign-in',
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
