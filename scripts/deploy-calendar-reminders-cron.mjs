#!/usr/bin/env node
/**
 * Deploy Cloudflare Cron Worker for calendar email reminders.
 * Sets CRON_SECRET on Supabase + Worker, then deploys.
 *
 * Run: npm run deploy:calendar-reminders-cron
 */
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const WORKER_CONFIG = join(ROOT, 'workers/calendar-reminders-cron/wrangler.jsonc');
const PROJECT_REF = process.env.VITE_SUPABASE_PROJECT_ID?.trim() || 'xexnwcmqnelgzuqhkvtx';

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[trimmed.slice(0, eq).trim()] = value;
  }
  return out;
}

function upsertEnvLine(lines, key, value) {
  const prefix = `${key}=`;
  let found = false;
  const next = lines.map((line) => {
    if (line.startsWith(prefix)) {
      found = true;
      return `${prefix}${value}`;
    }
    return line;
  });
  if (!found) next.push(`${prefix}${value}`);
  return next;
}

function ensureCronSecret() {
  const envLocalPath = join(ROOT, '.env.local');
  const env = {
    ...loadEnvFile(join(ROOT, '.env')),
    ...loadEnvFile(envLocalPath),
    ...process.env,
  };

  let secret = env.CRON_SECRET?.trim();
  if (!secret) {
    secret = randomBytes(32).toString('hex');
    console.log('Generated new CRON_SECRET');

    if (existsSync(envLocalPath)) {
      const lines = readFileSync(envLocalPath, 'utf8').split('\n');
      writeFileSync(envLocalPath, upsertEnvLine(lines, 'CRON_SECRET', secret).join('\n'));
    } else {
      writeFileSync(envLocalPath, `# Calendar reminders cron\nCRON_SECRET=${secret}\n`, { flag: 'a' });
    }
  }

  return secret;
}

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts });
}

const cronSecret = ensureCronSecret();

console.log(`Setting CRON_SECRET on Supabase (${PROJECT_REF})…`);
run(`supabase secrets set CRON_SECRET=${cronSecret} --project-ref ${PROJECT_REF}`);

console.log('Setting CRON_SECRET on Cloudflare Worker…');
run(`printf '%s' "${cronSecret}" | npx wrangler secret put CRON_SECRET --config "${WORKER_CONFIG}"`, {
  shell: '/bin/bash',
});

console.log('Deploying regal-calendar-reminders-cron worker…');
run(`npx wrangler deploy --config "${WORKER_CONFIG}"`);

console.log(`
Calendar reminders cron deployed.
Schedule: every 5 minutes (*/5 * * * *)
Worker:     regal-calendar-reminders-cron
Target:     https://${PROJECT_REF}.supabase.co/functions/v1/process-calendar-reminders

Manual test:
  curl -X POST "https://regal-calendar-reminders-cron.pleromadoxa.workers.dev" \\
    -H "x-cron-secret: (see CRON_SECRET in .env.local)"

Ensure RESEND_API_KEY is set on Supabase Edge Function secrets for emails to send.
`);
