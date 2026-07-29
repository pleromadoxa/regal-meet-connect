#!/usr/bin/env node
/**
 * Deploy Regal Meeting SPA to Cloudflare Pages.
 * Run: npm run deploy:pages
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT = process.env.PAGES_PROJECT?.trim() || 'regal-meeting';
const DOMAIN = process.env.MEET_DOMAIN?.trim() || 'meet.regalmesh.com';

function loadEnvForBuild() {
  const env = { ...process.env };
  for (const name of ['.env.local', '.env']) {
    const path = join(process.cwd(), name);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!env[key]) env[key] = value;
    }
  }
  if (!env.VITE_SITE_URL) env.VITE_SITE_URL = `https://${DOMAIN}`;
  return env;
}

const buildEnv = loadEnvForBuild();

console.log('Ensuring Cloudflare Pages project exists…');
execSync('node scripts/setup-pages.mjs', { stdio: 'inherit', env: buildEnv });

console.log('Building production bundle…');
execSync('npm run build', { stdio: 'inherit', env: buildEnv });

console.log(`Deploying to Cloudflare Pages project "${PROJECT}"…`);
execSync(
  `npx wrangler pages deploy dist --project-name=${PROJECT} --branch=main --commit-dirty=true`,
  { stdio: 'inherit', cwd: process.cwd(), env: buildEnv },
);

console.log(`
Pages deploy complete.
Custom domain: https://${DOMAIN}
Preview:       https://${PROJECT}.pages.dev
Dashboard:     https://dash.cloudflare.com → Workers & Pages → ${PROJECT} → Custom domains
`);
