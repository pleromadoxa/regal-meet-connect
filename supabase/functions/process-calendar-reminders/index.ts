import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { APP_URL, REPLY_TO_EMAIL } from "../_shared/brand.ts";
import { sendMail, zipperConfigured } from "../_shared/mail.ts";
import { calendarReminderEmail } from "../_shared/email-templates/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

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
    if (!zipperConfigured()) {
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

    let sent = 0;
    let failed = 0;

    for (const row of reminders) {
      const start = new Date(row.start_time);
      const end = new Date(row.end_time);
      const formattedStart = start.toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      });
      const formattedEnd = end.toLocaleString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      });

      const actionUrl = row.location?.startsWith("http")
        ? row.location
        : `${APP_URL}/calendar`;

      const content = calendarReminderEmail({
        recipientName: row.recipient_name || "there",
        title: row.title,
        formattedStart,
        formattedEnd,
        reminderMinutes: row.reminder_minutes,
        location: row.location,
        description: row.description,
        actionUrl,
      });

      try {
        const result = await sendMail({
          to: row.recipient_email,
          subject: `Reminder: ${row.title} starts in ${row.reminder_minutes} minutes`,
          html: content.html,
          text: content.text,
          product: "calendar",
          replyTo: row.host_email || REPLY_TO_EMAIL,
          idempotencyKey: `reminder-${row.source_type}-${row.source_id}-${row.recipient_email}-${row.reminder_minutes}`,
        });

        if (!result.ok) throw new Error(result.error || "send failed");

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

    return new Response(
      JSON.stringify({
        success: true,
        processed: reminders.length,
        sent,
        failed,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("process-calendar-reminders error:", err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
