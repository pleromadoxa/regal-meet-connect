/** Brand constants — keep in sync with src/constants/site.ts */
export const COMPANY_NAME = "Spatial Regal";
export const COMPANY_LEGAL_NAME = "Spatial Regal Digital Ltd";
export const PRODUCT_NAME = "Regal Meeting";
export const CALENDAR_PRODUCT_NAME = "Regal Calendar";
export const SUPPORT_EMAIL = "support@madebyregal.com";
export const REPLY_TO_EMAIL = "support@madebyregal.com";

export const APP_URL = (
  Deno.env.get("MEET_APP_URL") ??
  Deno.env.get("SITE_URL") ??
  "https://meet.regalmesh.com"
).replace(/\/$/, "");

/** Compact logo for email clients (hosted on Pages + optional R2 CDN). */
export const LOGO_URL =
  Deno.env.get("EMAIL_LOGO_URL")?.trim() ||
  `${APP_URL}/email/regal-meeting-logo.png`;
export const CALENDAR_URL = `${APP_URL}/calendar`;
export const DASHBOARD_URL = `${APP_URL}/dashboard`;
