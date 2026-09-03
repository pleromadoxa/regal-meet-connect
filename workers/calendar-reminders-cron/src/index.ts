interface Env {
  CRON_SECRET: string;
  REMINDERS_FUNCTION_URL: string;
}

async function invokeReminders(env: Env) {
  const res = await fetch(env.REMINDERS_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'x-cron-secret': env.CRON_SECRET,
      'Content-Type': 'application/json',
    },
  });

  let body: unknown;
  const text = await res.text();
  try {
    body = JSON.parse(text);
  } catch {
    body = text.slice(0, 500);
  }

  console.log('process-calendar-reminders', res.status, body);
  return { ok: res.ok, status: res.status, body };
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(invokeReminders(env));
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const secret =
      request.headers.get('x-cron-secret') ??
      request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ??
      url.searchParams.get('secret');

    if (!secret || secret !== env.CRON_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await invokeReminders(env);
    return Response.json({
      triggered: true,
      at: new Date().toISOString(),
      ...result,
    });
  },
};
