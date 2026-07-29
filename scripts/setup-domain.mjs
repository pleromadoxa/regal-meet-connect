#!/usr/bin/env node
/**
 * Finish meet.regalmesh.com on Cloudflare Pages:
 * 1. Attach custom domain with zone_id (auto-DNS when token allows)
 * 2. Upsert CNAME meet → regal-meeting.pages.dev
 *
 * Run: npm run setup:domain
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DOMAIN = process.env.MEET_DOMAIN?.trim() || 'meet.regalmesh.com';
const ZONE_NAME = process.env.REGAL_ZONE?.trim() || 'regalmesh.com';
const PAGES_PROJECT = process.env.PAGES_PROJECT?.trim() || 'regal-meeting';
const PAGES_CNAME = process.env.PAGES_CNAME?.trim() || `${PAGES_PROJECT}.pages.dev`;

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

async function cf(path, init = {}) {
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!token) throw new Error('Missing CLOUDFLARE_API_TOKEN — run npm run sync:cloudflare-credentials');

  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

async function resolveZone() {
  const preset = process.env.CLOUDFLARE_ZONE_ID?.trim();
  if (preset) {
    const res = await cf(`/zones/${preset}`);
    if (res.data.success && res.data.result) return res.data.result;
  }
  const res = await cf(`/zones?name=${ZONE_NAME}`);
  if (!res.data.success) throw new Error(res.data.errors?.[0]?.message ?? 'Zone lookup failed');
  const zone = res.data.result?.[0];
  if (!zone) throw new Error(`Zone not found for ${ZONE_NAME}`);
  return zone;
}

async function ensurePagesDomain(accountId, zoneId, name) {
  const list = await cf(`/accounts/${accountId}/pages/projects/${PAGES_PROJECT}/domains`);
  if (!list.data.success) throw new Error(JSON.stringify(list.data.errors));

  const existing = list.data.result?.find((d) => d.name === name);
  if (existing) {
    const verify = existing.verification_data?.error_message ?? '';
    if (verify.includes('CNAME')) {
      console.log(`↻ Re-attaching ${name} with zone_id for auto-DNS…`);
      await cf(`/accounts/${accountId}/pages/projects/${PAGES_PROJECT}/domains/${name}`, {
        method: 'DELETE',
      });
    } else {
      console.log(`✓ Pages domain: ${name} (${existing.status})`);
      return existing;
    }
  }

  const add = await cf(`/accounts/${accountId}/pages/projects/${PAGES_PROJECT}/domains`, {
    method: 'POST',
    body: JSON.stringify({ name, zone_id: zoneId }),
  });
  if (!add.data.success) throw new Error(JSON.stringify(add.data.errors));
  console.log(`✓ Attached Pages domain: ${name} (${add.data.result.status})`);
  return add.data.result;
}

async function upsertCname(zoneId, subdomain, target) {
  const list = await cf(`/zones/${zoneId}/dns_records?type=CNAME&per_page=100`);
  if (!list.data.success) {
    console.warn(`⚠ DNS API unavailable: ${list.data.errors?.[0]?.message ?? 'auth error'}`);
    return false;
  }

  const fqdn = `${subdomain}.${ZONE_NAME}`;
  const existing = (list.data.result ?? []).find(
    (r) => r.name === fqdn || r.name === subdomain,
  );

  if (existing?.content?.replace(/\.$/, '') === target.replace(/\.$/, '')) {
    console.log(`✓ DNS CNAME already set: ${subdomain} → ${target}`);
    return true;
  }

  const body = {
    type: 'CNAME',
    name: subdomain,
    content: target,
    proxied: true,
    comment: 'Regal Meeting — Cloudflare Pages',
  };

  if (existing) {
    const patch = await cf(`/zones/${zoneId}/dns_records/${existing.id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    if (patch.data.success) {
      console.log(`✓ Updated DNS CNAME: ${subdomain} → ${target}`);
      return true;
    }
    console.warn(`⚠ Could not update DNS: ${patch.data.errors?.[0]?.message ?? 'failed'}`);
    return false;
  }

  const create = await cf(`/zones/${zoneId}/dns_records`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (create.data.success) {
    console.log(`✓ Created DNS CNAME: ${subdomain} → ${target}`);
    return true;
  }
  console.warn(`⚠ Could not create DNS: ${create.data.errors?.[0]?.message ?? 'failed'}`);
  return false;
}

function printManualDns(subdomain, zoneId) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || 'ACCOUNT_ID';
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Manual DNS (if API token lacks Zone → DNS → Edit)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Pages custom domains:
   https://dash.cloudflare.com/${accountId}/pages/view/${PAGES_PROJECT}/domains

2. Add DNS record in ${ZONE_NAME} zone:
   Type:    CNAME
   Name:    ${subdomain}
   Target:  ${PAGES_CNAME}
   Proxy:   ON (orange cloud)

   DNS dashboard:
   https://dash.cloudflare.com/${zoneId}/${ZONE_NAME}/dns/records

3. Verify: curl -I https://${DOMAIN}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

async function main() {
  loadEnvFiles();
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  if (!accountId) throw new Error('Missing CLOUDFLARE_ACCOUNT_ID');

  console.log(`Regal Meeting — finish ${DOMAIN}\n`);

  const zone = await resolveZone();
  console.log(`✓ Zone: ${zone.name} (${zone.status}) — ${zone.id}\n`);

  await ensurePagesDomain(accountId, zone.id, DOMAIN);

  const subdomain = DOMAIN.replace(`.${ZONE_NAME}`, '');
  const dnsOk = await upsertCname(zone.id, subdomain, PAGES_CNAME);
  if (!dnsOk) printManualDns(subdomain, zone.id);

  const status = await cf(`/accounts/${accountId}/pages/projects/${PAGES_PROJECT}/domains`);
  const row = status.data.result?.find((d) => d.name === DOMAIN);
  if (row) {
    console.log(`\nDomain status: ${row.status}`);
    if (row.verification_data?.error_message) {
      console.log(`Verification: ${row.verification_data.error_message}`);
    }
  }

  console.log(`\nLive preview: https://${PAGES_CNAME}`);
  console.log(`Production:   https://${DOMAIN}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
