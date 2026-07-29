#!/usr/bin/env node
/**
 * Configure CORS on regal-meeting-files R2 bucket for browser uploads.
 * Run: npm run setup:r2-cors
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DOMAIN = process.env.MEET_DOMAIN?.trim() || 'meet.regalmesh.com';

const ORIGINS = [
  `https://${DOMAIN}`,
  'https://regal-meeting.pages.dev',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

function parseEnvFile(path) {
  const out = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) out[m[1].trim()] = m[2].trim();
  }
  return out;
}

async function main() {
  const env = parseEnvFile(join(process.cwd(), '.env.local'));
  const bucket =
    process.env.R2_BUCKET_NAME?.trim() || env.R2_BUCKET_NAME?.trim() || 'regal-meeting-files';
  const token = process.env.CLOUDFLARE_API_TOKEN || env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || env.CLOUDFLARE_ACCOUNT_ID;

  if (!token || !accountId) {
    console.error('Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID — run npm run sync:cloudflare-credentials');
    process.exit(1);
  }

  const corsRules = {
    rules: [
      {
        allowed: {
          origins: ORIGINS,
          methods: ['GET', 'PUT', 'HEAD', 'POST'],
          headers: ['Content-Type', 'Content-Length'],
        },
        exposeHeaders: ['ETag'],
        maxAgeSeconds: 3600,
      },
    ],
  };

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucket}/cors`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(corsRules),
  });

  const body = await response.json();
  if (!response.ok || !body.success) {
    console.error('Failed to set R2 CORS:', JSON.stringify(body, null, 2));
    process.exit(1);
  }

  console.log(`✓ R2 CORS configured on bucket "${bucket}"`);
  console.log('  Allowed origins:', ORIGINS.join(', '));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
