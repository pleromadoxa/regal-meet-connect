import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { Resend } from "npm:resend@2.0.0";
import { COMPANY_LEGAL_NAME, COMPANY_NAME, PRODUCT_NAME } from "../_shared/brand.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const APP_URL = (Deno.env.get("MEET_APP_URL") ?? "https://meet.regalmesh.com").replace(/\/$/, "");
const LOGO_URL = `${APP_URL}/regal-logo.png`;

interface DueReminder {
  source_type: string;
  source_id: string;
  recipient_email: string;
  recipient_name: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string | null;
  description: string | null;
  reminder_minutes: number;
  host_email: string;
}

const renderHtml = (opts: {
  recipientName: string;
  title: string;
  formattedStart: string;
  formattedEnd: string;
  reminderMinutes: number;
  location?: string | null;
  description?: string | null;
  calendarUrl: string;
}) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>Event reminder</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #efeaf6;">
          <tr>
            <td style="background:linear-gradient(135deg,#FF6B35 0%,#7B2CBF 100%);padding:36px 32px;text-align:center;">
              <img src="${LOGO_URL}" alt="Regal Calendar" width="64" height="64" style="display:block;margin:0 auto 12px;border-radius:14px;" />
              <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">Upcoming event reminder</h1>
              <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:13px;">Starting in ${opts.reminderMinutes} minutes</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:15px;color:#4a4458;">Hi ${opts.recipientName},</p>
              <p style="margin:0 0 22px;font-size:15px;color:#4a4458;line-height:1.6;">
                This is a reminder for your upcoming calendar event on Regal Calendar.
              </p>
              <div style="background:#fafafa;border:1px solid #efeaf6;border-radius:12px;padding:20px;margin-bottom:24px;">
                <h2 style="margin:0 0 16px;font-size:18px;color:#1a0d2e;">${opts.title}</h2>
                ${opts.description ? `<p style="margin:0 0 16px;color:#6b5e7a;font-size:14px;">${opts.description}</p>` : ''}
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
                  <tr>
                    <td style="padding:6px 0;color:#8b8298;width:110px;">Starts</td>
                    <td style="padding:6px 0;color:#1a0d2e;font-weight:500;">${opts.formattedStart}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#8b8298;">Ends</td>
                    <td style="padding:6px 0;color:#1a0d2e;">${opts.formattedEnd}</td>
                  </tr>
                  ${opts.location ? `<tr><td style="padding:6px 0;color:#8b8298;">Location</td><td style="padding:6px 0;color:#1a0d2e;">${opts.location}</td></tr>` : ''}
                </table>
              </div>
              <div style="text-align:center;margin:24px 0;">
                <a href="${opts.calendarUrl}" style="display:inline-block;background:linear-gradient(135deg,#FF6B35,#7B2CBF);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:10px;font-weight:600;font-size:15px;">
                  Open calendar
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;text-align:center;border-top:1px solid #efeaf6;background:#fafafa;">
              <p style="margin:0;color:#6b5e7a;font-size:12px;">© ${new Date().getFullYear()} ${COMPANY_LEGAL_NAME}. All rights reserved.</p>
              <p style="margin:6px 0 0;color:#8b8298;font-size:12px;">${PRODUCT_NAME} by <strong style="color:#7B2CBF;">${COMPANY_NAME}</strong></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

function isAuthorized(req: Request): boolean {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("Authorization") ?? "";
  const cronHeader = req.headers.get("x-cron-secret") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (cronSecret && cronHeader === cronSecret) return true;
  if (serviceKey && authHeader === `Bearer ${serviceKey}`) return true;
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!isAuthorized(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: due, error } = await admin.rpc("get_due_calendar_reminders", {
      p_window_minutes: 5,
    });

    if (error) throw error;

    const reminders = (due ?? []) as DueReminder[];
    if (reminders.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0, sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(apiKey);
    let sent = 0;
    let failed = 0;

    for (const row of reminders) {
      const start = new Date(row.start_time);
      const end = new Date(row.end_time);
      const formattedStart = start.toLocaleString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
        hour: "2-digit", minute: "2-digit", timeZoneName: "short",
      });
      const formattedEnd = end.toLocaleString("en-US", {
        hour: "2-digit", minute: "2-digit", timeZoneName: "short",
      });

      const joinLink = row.location?.startsWith("http") ? row.location : `${APP_URL}/calendar`;

      try {
        await resend.emails.send({
          from: "Regal Calendar <onboarding@resend.dev>",
          to: [row.recipient_email],
          reply_to: row.host_email,
          subject: `Reminder: ${row.title} starts in ${row.reminder_minutes} minutes`,
          html: renderHtml({
            recipientName: row.recipient_name || "there",
            title: row.title,
            formattedStart,
            formattedEnd,
            reminderMinutes: row.reminder_minutes,
            location: row.location,
            description: row.description,
            calendarUrl: joinLink,
          }),
        });

        await admin.rpc("mark_calendar_reminder_sent", {
          p_source_type: row.source_type,
          p_source_id: row.source_id,
          p_recipient_email: row.recipient_email,
          p_reminder_minutes: row.reminder_minutes,
        });

        sent++;
      } catch (err) {
        console.error("Reminder send failed:", row.recipient_email, err);
        failed++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed: reminders.length,
      sent,
      failed,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("process-calendar-reminders error:", err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
