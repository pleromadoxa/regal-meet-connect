#!/usr/bin/env node
/**
 * Print Supabase Edge Function secrets to set for Regal Meeting.
 * Run after: npm run sync:cloudflare-credentials
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

const secrets = {
  CLOUDFLARE_REALTIME_APP_ID: env.CLOUDFLARE_REALTIME_APP_ID ?? env.CALLS_APP_ID,
  CLOUDFLARE_REALTIME_APP_SECRET: env.CLOUDFLARE_REALTIME_APP_SECRET ?? env.CALLS_APP_SECRET,
  CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN,
  CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID ?? env.R2_ACCOUNT_ID,
  R2_ACCOUNT_ID: env.R2_ACCOUNT_ID ?? env.CLOUDFLARE_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY,
  R2_S3_ENDPOINT: env.R2_S3_ENDPOINT,
  R2_BUCKET_NAME: env.R2_BUCKET_NAME ?? 'regal-meeting-files',
  R2_PUBLIC_URL: env.VITE_R2_PUBLIC_URL ?? env.R2_PUBLIC_URL,
  REGAL_MAIL_SUPABASE_URL: env.VITE_REGAL_MAIL_SUPABASE_URL ?? 'https://xexnwcmqnelgzuqhkvtx.supabase.co',
  REGAL_MAIL_SERVICE_ROLE_KEY: env.REGAL_MAIL_SERVICE_ROLE_KEY,
};

console.log(`Set these secrets on Supabase (${env.VITE_SUPABASE_PROJECT_ID ?? 'xexnwcmqnelgzuqhkvtx'}) → Edge Functions → Secrets:\n`);
for (const [key, value] of Object.entries(secrets)) {
  console.log(`  ${key}=${value ? '(set)' : '(missing)'}`);
}

const projectRef = env.VITE_SUPABASE_PROJECT_ID ?? 'xexnwcmqnelgzuqhkvtx';
console.log('\nDeploy functions:\n');
console.log(`  supabase functions deploy meeting-sfu --project-ref ${projectRef}`);
console.log(`  supabase functions deploy meeting-r2 --project-ref ${projectRef}`);
console.log(`  supabase functions deploy cloudflare-health --project-ref ${projectRef} --no-verify-jwt`);
