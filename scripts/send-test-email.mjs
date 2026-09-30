#!/usr/bin/env node
/**
 * Smoke-test Zipper Mail with Regal Meeting branding.
 * Usage: node scripts/send-test-email.mjs you@example.com
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
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
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
  ...process.env,
};

const to = process.argv[2] || env.ZIPPER_TEST_TO;
if (!to || !to.includes('@')) {
  console.error('Usage: node scripts/send-test-email.mjs you@example.com');
  process.exit(1);
}

const apiUrl = (env.ZIPPER_EMAIL_API_URL || 'https://tinyzipper.com/api/v1/email/send').replace(
  /\/$/,
  ''
);
const sendKey = env.ZIPPER_EMAIL_SEND_KEY;
const fromEmail = env.ZIPPER_EMAIL_FROM_ADDRESS || 'regalmeetings@mail.tinyzipper.com';
const fromName = env.ZIPPER_EMAIL_FROM_NAME || 'Regal Meetings';
const replyTo = env.ZIPPER_EMAIL_REPLY_TO || 'support@madebyregal.com';
const appUrl = (env.VITE_SITE_URL || env.MEET_APP_URL || 'https://meet.regalmesh.com').replace(
  /\/$/,
  ''
);
// Prefer compact email asset (192px). Override with EMAIL_LOGO_URL if set.
const logo =
  env.EMAIL_LOGO_URL ||
  `${appUrl}/email/regal-meeting-logo.png`;

if (!sendKey) {
  console.error('Missing ZIPPER_EMAIL_SEND_KEY in .env.local');
  process.exit(1);
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Regal Meeting delivery check</title>
</head>
<body style="margin:0;padding:0;background:#f6f4f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Regal Meeting delivery check via Zipper Mail.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4f1;">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #ebe6e1;max-width:560px;width:100%;">
          <tr>
            <td align="center" style="padding:28px 24px 12px;">
              <img src="${logo}" width="64" height="64" alt="Regal Meeting" style="display:block;margin:0 auto;border:0;outline:none;text-decoration:none;width:64px;height:64px;" />
              <div style="font-size:13px;font-weight:700;color:#111;margin-top:10px;">Regal Meeting</div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:8px 28px 0;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#FF6B35;">Delivery check</div>
              <h1 style="margin:8px 0 0;font-size:22px;color:#111;">Your mail pipeline works</h1>
              <div style="width:40px;height:3px;background:#FF6B35;border-radius:2px;margin:14px auto 0;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 28px;color:#5c5c5c;font-size:15px;line-height:1.6;">
              <p style="margin:0 0 12px;">This transactional message confirms Regal Meeting email delivery via Zipper Mail.</p>
              <p style="margin:0;">From: <strong style="color:#111;">${fromName}</strong> &lt;${fromEmail}&gt;</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 28px 28px;">
              <a href="${appUrl}" style="display:inline-block;background:#FF6B35;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:700;">Open Regal Meeting</a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;border-top:1px solid #ebe6e1;text-align:center;font-size:12px;color:#8a8580;">
              © Spatial Regal Digital Ltd · Regal Meeting<br/>
              <a href="mailto:support@madebyregal.com" style="color:#FF6B35;text-decoration:none;">support@madebyregal.com</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const text = [
  'Regal Meeting — Zipper Mail delivery check',
  '',
  `From: ${fromName} <${fromEmail}>`,
  `Open: ${appUrl}`,
  '',
  'Spatial Regal Digital Ltd · support@madebyregal.com',
].join('\n');

const res = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${sendKey}`,
    'Content-Type': 'application/json',
    'Idempotency-Key': `smoke-${Date.now()}`,
  },
  body: JSON.stringify({
    from: { email: fromEmail, name: fromName },
    to: [to],
    subject: 'Regal Meeting · delivery check',
    html,
    text,
    reply_to: replyTo,
    tags: ['transactional', 'smoke-test'],
  }),
});

const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error('Send failed', res.status, body);
  process.exit(1);
}
console.log('Sent OK →', to);
console.log('Logo URL →', logo);
console.log(JSON.stringify(body, null, 2));
