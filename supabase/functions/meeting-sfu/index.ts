import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const REALTIME_API = 'https://rtc.live.cloudflare.com/v1';

function readRealtimeConfig() {
  const appId = Deno.env.get('CLOUDFLARE_REALTIME_APP_ID') ?? Deno.env.get('CALLS_APP_ID') ?? '';
  const appSecret =
    Deno.env.get('CLOUDFLARE_REALTIME_APP_SECRET') ?? Deno.env.get('CALLS_APP_SECRET') ?? '';
  if (!appId || !appSecret) return null;
  return { appId, appSecret };
}

async function realtimeFetch(appId: string, appSecret: string, path: string, init: RequestInit = {}) {
  const url = `${REALTIME_API}/apps/${appId}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${appSecret}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!response.ok) {
    const detail =
      (json.errorDescription as string) ||
      (json.error as string) ||
      text ||
      response.statusText;
    throw new Error(detail);
  }
  return json;
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

  const config = readRealtimeConfig();
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const authHeader = req.headers.get('Authorization');

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const action = String(body.action ?? '');

  if (action === 'status') {
    return new Response(JSON.stringify({ configured: Boolean(config) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!config) {
    return new Response(
      JSON.stringify({
        error: 'Cloudflare Realtime SFU is not configured. Set CLOUDFLARE_REALTIME_APP_ID and CLOUDFLARE_REALTIME_APP_SECRET.',
        configured: false,
      }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!authHeader?.startsWith('Bearer ') || !supabaseUrl || !anonKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { appId, appSecret } = config;
  const meetingId = typeof body.meetingId === 'string' ? body.meetingId : '';
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';

  try {
    if (action === 'create-session') {
      const correlationId = meetingId ? `${meetingId}:${userData.user.id}` : userData.user.id;
      const result = await realtimeFetch(appId, appSecret, `/sessions/new?correlationId=${encodeURIComponent(correlationId)}`, {
        method: 'POST',
        body: '{}',
      });
      return new Response(JSON.stringify({ sessionId: result.sessionId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'sessionId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'tracks-new') {
      const payload: Record<string, unknown> = {};
      if (body.sessionDescription) payload.sessionDescription = body.sessionDescription;
      if (body.tracks) payload.tracks = body.tracks;
      if (body.autoDiscover) payload.autoDiscover = body.autoDiscover;

      const result = await realtimeFetch(appId, appSecret, `/sessions/${sessionId}/tracks/new`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'renegotiate') {
      const result = await realtimeFetch(appId, appSecret, `/sessions/${sessionId}/renegotiate`, {
        method: 'PUT',
        body: JSON.stringify({ sessionDescription: body.sessionDescription }),
      });
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'tracks-close') {
      const result = await realtimeFetch(appId, appSecret, `/sessions/${sessionId}/tracks/close`, {
        method: 'PUT',
        body: JSON.stringify({
          tracks: body.tracks,
          force: body.force ?? false,
        }),
      });
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'SFU request failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
