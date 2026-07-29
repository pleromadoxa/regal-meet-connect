#!/usr/bin/env node
/** Ensure Cloudflare Pages project exists for Regal Meeting. */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT = process.env.PAGES_PROJECT?.trim() || 'regal-meeting';

function loadEnvFiles() {
  for (const name of ['.env.local', '.env']) {
    const path = join(process.cwd(), name);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
    }
  }
}

async function main() {
  loadEnvFiles();
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || process.env.R2_ACCOUNT_ID?.trim();
  if (!token || !accountId) throw new Error('Missing credentials — run npm run sync:cloudflare-credentials');

  const listRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const listData = await listRes.json();
  if (listData.result?.some((p) => p.name === PROJECT)) {
    console.log(`Pages project "${PROJECT}" already exists`);
    return;
  }

  const createRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: PROJECT,
        production_branch: 'main',
      }),
    },
  );
  const createData = await createRes.json();
  if (!createData.success) {
    throw new Error(
      `Pages create failed: ${createData.errors?.[0]?.message ?? JSON.stringify(createData.errors)}`,
    );
  }
  console.log(`Created Pages project "${PROJECT}"`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
