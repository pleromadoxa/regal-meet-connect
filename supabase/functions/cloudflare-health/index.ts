import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { isR2Configured, readR2Config } from '../_shared/r2.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function checkCloudflareApi(token: string, accountId: string): Promise<{ ok: boolean; detail?: string }> {
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    return { ok: res.ok && json.success === true, detail: json.errors?.[0]?.message };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const meetingUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const meetingServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const regalMailServiceKey = Deno.env.get('REGAL_MAIL_SERVICE_ROLE_KEY') ?? '';
  const cfToken = Deno.env.get('CLOUDFLARE_API_TOKEN') ?? '';
  const r2Config = readR2Config();

  const status = {
    timestamp: new Date().toISOString(),
    meetingSupabase: Boolean(meetingUrl && meetingServiceKey),
    regalMailBridge: Boolean(regalMailServiceKey),
    r2: isR2Configured(),
    r2Bucket: r2Config?.bucket ?? null,
    r2PublicUrl: r2Config?.publicUrl ?? null,
    cloudflareApi: false as boolean,
    cloudflareApiDetail: undefined as string | undefined,
    database: false as boolean,
    regalMailSupabase: false as boolean,
  };

  if (cfToken && r2Config?.accountId) {
    const cf = await checkCloudflareApi(cfToken, r2Config.accountId);
    status.cloudflareApi = cf.ok;
    status.cloudflareApiDetail = cf.detail;
  }

  if (meetingUrl && meetingServiceKey) {
    try {
      const admin = createClient(meetingUrl, meetingServiceKey);
      const { error } = await admin.from('profiles').select('id').limit(1);
      status.database = !error;
    } catch {
      status.database = false;
    }
  }

  const regalMailUrl =
    Deno.env.get('REGAL_MAIL_SUPABASE_URL') ?? 'https://xexnwcmqnelgzuqhkvtx.supabase.co';
  if (regalMailUrl && regalMailServiceKey) {
    try {
      const regal = createClient(regalMailUrl, regalMailServiceKey);
      const { error } = await regal.auth.admin.listUsers({ page: 1, perPage: 1 });
      status.regalMailSupabase = !error;
    } catch {
      status.regalMailSupabase = false;
    }
  }

  const healthy =
    status.meetingSupabase &&
    status.database &&
    status.regalMailBridge &&
    status.regalMailSupabase &&
    status.r2;

  return new Response(JSON.stringify({ healthy, ...status }), {
    status: healthy ? 200 : 503,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
