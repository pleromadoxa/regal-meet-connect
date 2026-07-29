#!/usr/bin/env node
/**
 * Test Supabase + Cloudflare connections for Regal Meeting.
 * Run: npm run test:connections
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq);
    let value = trimmed.slice(eq + 1);
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const root = process.cwd();
const env = {
  ...loadEnvFile(join(root, '.env')),
  ...loadEnvFile(join(root, '.env.local')),
};

const meetingUrl = env.VITE_SUPABASE_URL;
const meetingKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const regalMailUrl = env.VITE_REGAL_MAIL_SUPABASE_URL ?? 'https://xexnwcmqnelgzuqhkvtx.supabase.co';
const regalMailKey = env.VITE_REGAL_MAIL_SUPABASE_ANON_KEY;
const cfToken = env.CLOUDFLARE_API_TOKEN;
const accountId = env.R2_ACCOUNT_ID ?? env.CLOUDFLARE_ACCOUNT_ID;

const results = [];

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail });
    console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({ name, ok: false, detail: message });
    console.log(`✗ ${name} — ${message}`);
  }
}

async function pingSupabase(name, url, key) {
  const res = await fetch(`${url}/auth/v1/health`, {
    headers: { apikey: key },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return url;
}

await check('Meeting Supabase', async () => {
  if (!meetingUrl || !meetingKey) throw new Error('Missing VITE_SUPABASE_URL or key');
  return pingSupabase('meeting', meetingUrl, meetingKey);
});

await check('Regal Mail Supabase', async () => {
  if (!regalMailKey) throw new Error('Missing VITE_REGAL_MAIL_SUPABASE_ANON_KEY');
  return pingSupabase('regal-mail', regalMailUrl, regalMailKey);
});

await check('Cloudflare API', async () => {
  if (!cfToken || !accountId) throw new Error('Missing CLOUDFLARE_API_TOKEN or account ID — run npm run sync:cloudflare-credentials');
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}`, {
    headers: { Authorization: `Bearer ${cfToken}` },
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.errors?.[0]?.message ?? `HTTP ${res.status}`);
  return `account ${accountId}`;
});

await check('Cloudflare health edge function', async () => {
  if (!meetingUrl || !meetingKey) throw new Error('Missing meeting Supabase config');
  const res = await fetch(`${meetingUrl}/functions/v1/cloudflare-health`, {
    headers: { Authorization: `Bearer ${meetingKey}` },
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? `HTTP ${res.status} — deploy edge functions and set secrets`);
  }
  const parts = [
    json.r2 ? 'R2' : 'R2✗',
    json.regalMailBridge ? 'RegalMail' : 'RegalMail✗',
    json.database ? 'DB' : 'DB✗',
  ];
  return parts.join(', ');
});

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed > 0 ? 1 : 0);
