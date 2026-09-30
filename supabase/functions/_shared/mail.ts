/**
 * Zipper Mail (TinyZipper) transactional send helper for Supabase Edge Functions.
 * Always send both html + text, a real Reply-To, and keep mail transactional (no marketing tags).
 */

export type MailProduct = "meeting" | "calendar";

export interface SendMailInput {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  /** Defaults from env / product */
  fromName?: string;
  replyTo?: string;
  /** Safe retries */
  idempotencyKey?: string;
  product?: MailProduct;
  tags?: string[];
}

export interface SendMailResult {
  ok: boolean;
  id?: string;
  error?: string;
  status?: number;
  raw?: unknown;
}

const DEFAULT_API = "https://tinyzipper.com/api/v1/email/send";
const DEFAULT_FROM = "regalmeetings@mail.tinyzipper.com";

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/(div|h1|h2|h3|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function ensureText(html: string, text?: string): string {
  const t = text?.trim();
  if (t) return t;
  return stripHtml(html);
}

export function zipperConfigured(): boolean {
  return Boolean(Deno.env.get("ZIPPER_EMAIL_SEND_KEY")?.trim());
}

export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const apiUrl = (Deno.env.get("ZIPPER_EMAIL_API_URL") ?? DEFAULT_API).replace(/\/$/, "");
  const sendKey = Deno.env.get("ZIPPER_EMAIL_SEND_KEY")?.trim();
  const fromEmail =
    Deno.env.get("ZIPPER_EMAIL_FROM_ADDRESS")?.trim() || DEFAULT_FROM;
  const defaultName =
    Deno.env.get("ZIPPER_EMAIL_FROM_NAME")?.trim() || "Regal Meetings";
  const replyTo =
    input.replyTo ||
    Deno.env.get("ZIPPER_EMAIL_REPLY_TO")?.trim() ||
    Deno.env.get("REPLY_TO_EMAIL")?.trim() ||
    "support@madebyregal.com";

  if (!sendKey) {
    return { ok: false, error: "ZIPPER_EMAIL_SEND_KEY not configured", status: 503 };
  }

  const to = (Array.isArray(input.to) ? input.to : [input.to])
    .map((e) => e.trim())
    .filter(Boolean);

  if (to.length === 0) {
    return { ok: false, error: "No recipients", status: 400 };
  }

  const fromName =
    input.fromName ||
    (input.product === "calendar" ? "Regal Calendar" : defaultName);

  const payload = {
    from: { email: fromEmail, name: fromName },
    to,
    subject: input.subject,
    html: input.html,
    text: ensureText(input.html, input.text),
    reply_to: replyTo,
    // Transactional only — never tag as marketing for invites/reminders
    tags: input.tags?.length ? input.tags : ["transactional", input.product ?? "meeting"],
  };

  const headers: Record<string, string> = {
    Authorization: `Bearer ${sendKey}`,
    "Content-Type": "application/json",
  };
  if (input.idempotencyKey) {
    headers["Idempotency-Key"] = input.idempotencyKey;
  }

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const raw = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message =
        (raw as { error?: string; message?: string })?.error ||
        (raw as { message?: string })?.message ||
        `Zipper API ${res.status}`;
      return { ok: false, error: message, status: res.status, raw };
    }
    const id =
      (raw as { id?: string; message_id?: string; data?: { id?: string } })?.id ||
      (raw as { message_id?: string })?.message_id ||
      (raw as { data?: { id?: string } })?.data?.id;
    return { ok: true, id, status: res.status, raw };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      status: 500,
    };
  }
}
