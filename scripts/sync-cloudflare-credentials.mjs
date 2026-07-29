#!/usr/bin/env node
/**
 * Import Cloudflare credentials from ~/Documents/CLOUDFLARE 2.md into .env.local
 * Run: npm run sync:cloudflare-credentials
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const SOURCES = [
  join(homedir(), 'Documents', 'CLOUDFLARE 2.md'),
  join(homedir(), 'Documents', 'Flysend', 'CLOUDFLARE 2', 'CLOUDFLARE 2.md'),
];

function parseMd(text) {
  const token = text.match(/API Token:\s*(\S+)/i)?.[1];
  const accessKey = text.match(/Access Key ID:\s*(\S+)/i)?.[1];
  const secretKey = text.match(/Secret Access Key:\s*(\S+)/i)?.[1];
  const endpoint = text.match(/S3 API endpoint:\s*(https:\/\/\S+)/i)?.[1];
  const accountId = endpoint?.match(/https:\/\/([^.]+)\.r2\.cloudflarestorage\.com/)?.[1];
  return { token, accessKey, secretKey, endpoint, accountId };
}

function upsertEnv(lines, key, value) {
  const prefix = `${key}=`;
  let found = false;
  const next = lines.map((line) => {
    if (line.startsWith(prefix)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });
  if (!found) next.push(`${key}=${value}`);
  return next;
}

function main() {
  const source = SOURCES.find((p) => existsSync(p));
  if (!source) {
    console.error('Could not find CLOUDFLARE 2.md in Documents');
    process.exit(1);
  }

  const parsed = parseMd(readFileSync(source, 'utf8'));
  if (!parsed.token || !parsed.accessKey || !parsed.secretKey) {
    console.error('CLOUDFLARE 2.md is missing token or R2 keys');
    process.exit(1);
  }

  const envPath = join(process.cwd(), '.env.local');
  const existing = existsSync(envPath) ? readFileSync(envPath, 'utf8').split('\n') : [];

  let lines = existing;
  lines = upsertEnv(lines, 'CLOUDFLARE_API_TOKEN', parsed.token);
  if (parsed.accountId) {
    lines = upsertEnv(lines, 'CLOUDFLARE_ACCOUNT_ID', parsed.accountId);
    lines = upsertEnv(lines, 'R2_ACCOUNT_ID', parsed.accountId);
  }
  lines = upsertEnv(lines, 'R2_ACCESS_KEY_ID', parsed.accessKey);
  lines = upsertEnv(lines, 'R2_SECRET_ACCESS_KEY', parsed.secretKey);
  if (parsed.endpoint) lines = upsertEnv(lines, 'R2_S3_ENDPOINT', parsed.endpoint);
  lines = upsertEnv(lines, 'R2_BUCKET_NAME', 'regal-meeting-files');
  lines = upsertEnv(lines, 'VITE_R2_PUBLIC_URL', 'https://pub-6a39992a6616496caf0575e44acb32aa.r2.dev');
  lines = upsertEnv(lines, 'CLOUDFLARE_ZONE_ID', 'ea22f581b752a0fb1ffd03a2a36b3a5c');
  lines = upsertEnv(lines, 'REGAL_ZONE', 'regalmesh.com');
  lines = upsertEnv(lines, 'MEET_DOMAIN', 'meet.regalmesh.com');
  lines = upsertEnv(lines, 'PAGES_PROJECT', 'regal-meeting');
  lines = upsertEnv(lines, 'PAGES_CNAME', 'regal-meeting.pages.dev');
  lines = upsertEnv(lines, 'VITE_SITE_URL', 'https://meet.regalmesh.com');

  writeFileSync(envPath, lines.filter((l, i, a) => l !== '' || i < a.length - 1).join('\n') + '\n');
  console.log(`Synced Cloudflare credentials from ${source} → .env.local`);
  console.log('Next: npm run setup:cloudflare  or  npm run deploy');
}

main();
