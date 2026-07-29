#!/usr/bin/env node
/**
 * Regal Meeting — Cloudflare setup (credentials, R2 CORS, Pages project, domain).
 * Run: npm run setup:cloudflare
 */
import { execSync } from 'node:child_process';

function run(cmd, label) {
  console.log(`\n▶ ${label}`);
  try {
    execSync(cmd, { stdio: 'inherit', cwd: process.cwd() });
    return true;
  } catch {
    console.warn(`⚠ Skipped: ${label}`);
    return false;
  }
}

console.log('Regal Meeting — Cloudflare setup\n');

run('node scripts/sync-cloudflare-credentials.mjs', 'Sync credentials from CLOUDFLARE 2.md');
run('node scripts/setup-pages.mjs', 'Cloudflare Pages project');
run('node scripts/configure-r2-cors.mjs', 'R2 bucket CORS for meet.regalmesh.com');
run('node scripts/setup-domain.mjs', 'Custom domain meet.regalmesh.com');

console.log(`
Next: npm run deploy:pages   → build + push to Cloudflare Pages
      npm run deploy           → deploy + ensure custom domain DNS
`);
