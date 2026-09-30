import {
  APP_URL,
  CALENDAR_PRODUCT_NAME,
  CALENDAR_URL,
  COMPANY_LEGAL_NAME,
  COMPANY_NAME,
  DASHBOARD_URL,
  LOGO_URL,
  PRODUCT_NAME,
  SUPPORT_EMAIL,
} from "../brand.ts";

export type EmailProduct = "meeting" | "calendar" | "both";

export interface LayoutOpts {
  product: EmailProduct;
  preheader: string;
  title: string;
  eyebrow?: string;
  bodyHtml: string;
  cta?: { label: string; url: string };
  secondaryCta?: { label: string; url: string };
  footerNote?: string;
}

const ORANGE = "#FF6B35";
const INK = "#111111";
const MUTED = "#5c5c5c";
const BORDER = "#ebe6e1";
const BG = "#f6f4f1";
const CARD = "#ffffff";

function productLabel(product: EmailProduct): string {
  if (product === "calendar") return CALENDAR_PRODUCT_NAME;
  if (product === "both") return `${PRODUCT_NAME} + ${CALENDAR_PRODUCT_NAME}`;
  return PRODUCT_NAME;
}

function logoHeader(product: EmailProduct): string {
  // Always Regal Meeting brand mark — calendar emails keep the same logo, different eyebrow/copy.
  const alt = product === "calendar" ? CALENDAR_PRODUCT_NAME : PRODUCT_NAME;
  return `<tr>
    <td align="center" style="padding:28px 24px 12px;">
      <img src="${LOGO_URL}" width="64" height="64" alt="${alt}" style="display:block;margin:0 auto;border:0;outline:none;text-decoration:none;width:64px;height:64px;" />
      <div style="font-size:13px;font-weight:700;color:${INK};margin-top:10px;letter-spacing:-0.01em;">${PRODUCT_NAME}</div>
    </td>
  </tr>`;
}

function stripRough(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/(h\d|li|tr|div)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Shared transactional email shell — table layout, light background, orange brand accent. */
export function emailLayout(opts: LayoutOpts): { html: string; text: string } {
  const year = new Date().getFullYear();
  const label = productLabel(opts.product);

  const ctaBlock = opts.cta
    ? `<tr><td align="center" style="padding:8px 32px 8px;">
        <a href="${opts.cta.url}" style="display:inline-block;background:${ORANGE};color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px;">
          ${opts.cta.label}
        </a>
      </td></tr>`
    : "";

  const secondary = opts.secondaryCta
    ? `<tr><td align="center" style="padding:4px 32px 20px;">
        <a href="${opts.secondaryCta.url}" style="color:${ORANGE};font-size:13px;text-decoration:underline;">${opts.secondaryCta.label}</a>
      </td></tr>`
    : `<tr><td style="height:12px;line-height:12px;">&nbsp;</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${INK};-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">
    ${opts.preheader}
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${CARD};border-radius:18px;overflow:hidden;border:1px solid ${BORDER};">
          ${logoHeader(opts.product)}
          <tr>
            <td align="center" style="padding:4px 32px 0;">
              ${opts.eyebrow ? `<div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${ORANGE};margin-bottom:8px;">${opts.eyebrow}</div>` : ""}
              <h1 style="margin:0;font-size:24px;line-height:1.25;font-weight:700;color:${INK};letter-spacing:-0.02em;">${opts.title}</h1>
              <div style="width:40px;height:3px;background:${ORANGE};border-radius:2px;margin:16px auto 0;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 8px;font-size:15px;line-height:1.65;color:${MUTED};">
              ${opts.bodyHtml}
            </td>
          </tr>
          ${ctaBlock}
          ${secondary}
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid ${BORDER};background:#faf9f7;">
              <p style="margin:0 0 8px;font-size:12px;color:${MUTED};text-align:center;line-height:1.5;">
                ${opts.footerNote || `You’re receiving this because of activity on ${label}.`}
              </p>
              <p style="margin:0;font-size:12px;color:#8a8580;text-align:center;line-height:1.5;">
                © ${year} ${COMPANY_LEGAL_NAME}<br/>
                ${PRODUCT_NAME} by ${COMPANY_NAME}<br/>
                <a href="${APP_URL}" style="color:${ORANGE};text-decoration:none;">${APP_URL.replace(/^https?:\/\//, "")}</a>
                · <a href="mailto:${SUPPORT_EMAIL}" style="color:${ORANGE};text-decoration:none;">${SUPPORT_EMAIL}</a>
              </p>
              <p style="margin:10px 0 0;font-size:11px;color:#a39e98;text-align:center;">
                <a href="${DASHBOARD_URL}" style="color:#a39e98;text-decoration:underline;">Dashboard</a>
                &nbsp;·&nbsp;
                <a href="${APP_URL}/settings" style="color:#a39e98;text-decoration:underline;">Settings</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    opts.title,
    opts.preheader,
    "",
    stripRough(opts.bodyHtml),
    opts.cta ? `${opts.cta.label}: ${opts.cta.url}` : "",
    opts.secondaryCta ? `${opts.secondaryCta.label}: ${opts.secondaryCta.url}` : "",
    "",
    `© ${year} ${COMPANY_LEGAL_NAME}`,
    PRODUCT_NAME,
    SUPPORT_EMAIL,
    APP_URL,
  ]
    .filter(Boolean)
    .join("\n");

  return { html, text };
}

export function detailCard(rows: { label: string; value: string }[]): string {
  const trs = rows
    .map(
      (r) => `<tr>
      <td style="padding:8px 0;color:#8a8580;width:120px;font-size:13px;vertical-align:top;">${r.label}</td>
      <td style="padding:8px 0;color:${INK};font-size:14px;font-weight:600;vertical-align:top;">${r.value}</td>
    </tr>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;">
    <tr>
      <td style="background:#faf9f7;border:1px solid ${BORDER};border-radius:12px;padding:12px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${trs}</table>
      </td>
    </tr>
  </table>`;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
