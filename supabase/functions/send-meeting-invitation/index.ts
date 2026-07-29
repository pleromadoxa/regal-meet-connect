import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const APP_URL = (Deno.env.get("MEET_APP_URL") ?? "https://meet.regalmesh.com").replace(/\/$/, "");
const LOGO_URL = `${APP_URL}/regal-mail-logo.png`;

interface InvitationRequest {
  scheduledMeetingId?: string;
  meeting?: {
    id: string;
    title: string;
    description?: string;
    scheduledTime: string;
    duration: number;
    link?: string;
  };
  invitees: Array<string | { email: string; name?: string }>;
  hostName?: string;
  hostEmail?: string;
}

const renderHtml = (opts: {
  meeting: NonNullable<InvitationRequest['meeting']>;
  hostName: string;
  inviteeName?: string;
  joinLink: string;
  formattedDate: string;
}) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>Meeting invitation</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #efeaf6;">
          <tr>
            <td style="background:linear-gradient(135deg,#FF6B35 0%,#7B2CBF 100%);padding:36px 32px;text-align:center;">
              <img src="${LOGO_URL}" alt="Regal Meeting" width="64" height="64" style="display:block;margin:0 auto 12px;border-radius:14px;" />
              <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">You're invited to a meeting</h1>
              <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:13px;">Works on web and the Regal Meeting mobile app</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:15px;color:#4a4458;">Hi ${opts.inviteeName || 'there'},</p>
              <p style="margin:0 0 22px;font-size:15px;color:#4a4458;line-height:1.6;">
                <strong style="color:#1a0d2e;">${opts.hostName}</strong> has invited you to join a meeting on Regal Meeting.
              </p>
              <div style="background:#fafafa;border:1px solid #efeaf6;border-radius:12px;padding:20px;margin-bottom:24px;">
                <h2 style="margin:0 0 16px;font-size:18px;color:#1a0d2e;">${opts.meeting.title}</h2>
                ${opts.meeting.description ? `<p style="margin:0 0 16px;color:#6b5e7a;font-size:14px;">${opts.meeting.description}</p>` : ''}
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
                  <tr>
                    <td style="padding:6px 0;color:#8b8298;width:110px;">When</td>
                    <td style="padding:6px 0;color:#1a0d2e;font-weight:500;">${opts.formattedDate}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#8b8298;">Duration</td>
                    <td style="padding:6px 0;color:#1a0d2e;">${opts.meeting.duration} minutes</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#8b8298;">Meeting ID</td>
                    <td style="padding:6px 0;color:#1a0d2e;font-family:monospace;font-weight:600;">${opts.meeting.id}</td>
                  </tr>
                </table>
              </div>
              <div style="text-align:center;margin:24px 0;">
                <a href="${opts.joinLink}" style="display:inline-block;background:linear-gradient(135deg,#FF6B35,#7B2CBF);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:10px;font-weight:600;font-size:15px;">
                  Join meeting
                </a>
              </div>
              <p style="font-size:13px;color:#8b8298;text-align:center;margin:14px 0 0;">
                Or open this link on your phone or browser:<br/>
                <a href="${opts.joinLink}" style="color:#7B2CBF;word-break:break-all;">${opts.joinLink}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;text-align:center;border-top:1px solid #efeaf6;background:#fafafa;">
              <p style="margin:0;color:#6b5e7a;font-size:12px;">
                © ${new Date().getFullYear()} Regal Meeting. All rights reserved.
              </p>
              <p style="margin:6px 0 0;color:#8b8298;font-size:12px;">
                Powered by <strong style="color:#7B2CBF;">Quantum Regal</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: InvitationRequest = await req.json();
    let { meeting, invitees, hostName = 'Your host', hostEmail } = body;

    if (!meeting && body.scheduledMeetingId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      const admin = createClient(supabaseUrl, serviceKey);
      const { data: row, error } = await admin
        .from("scheduled_meetings")
        .select("meeting_id, title, description, scheduled_time, duration_minutes, meeting_link, host_id")
        .eq("id", body.scheduledMeetingId)
        .maybeSingle();
      if (error || !row) {
        return new Response(JSON.stringify({ error: "Scheduled meeting not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      meeting = {
        id: row.meeting_id,
        title: row.title,
        description: row.description ?? undefined,
        scheduledTime: row.scheduled_time,
        duration: row.duration_minutes,
        link: row.meeting_link ?? `${APP_URL}/meeting/${row.meeting_id}`,
      };
      if (!hostEmail) {
        const { data: hostUser } = await admin.auth.admin.getUserById(row.host_id);
        hostEmail = hostUser.user?.email ?? undefined;
      }
    }

    if (!meeting) {
      return new Response(JSON.stringify({ error: "Missing meeting payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const scheduled = new Date(meeting.scheduledTime);
    const formattedDate = scheduled.toLocaleString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    });
    const joinLink = meeting.link || `${APP_URL}/meeting/${meeting.id}`;

    const resend = new Resend(apiKey);
    const sends = invitees.map((entry) => {
      const email = typeof entry === 'string' ? entry : entry.email;
      const name = typeof entry === 'string' ? undefined : entry.name;
      return resend.emails.send({
        from: "Regal Meeting <onboarding@resend.dev>",
        to: [email],
        subject: `${hostName} invited you: ${meeting!.title}`,
        reply_to: hostEmail,
        html: renderHtml({ meeting, hostName, inviteeName: name, joinLink, formattedDate }),
      });
    });

    const results = await Promise.allSettled(sends);
    const failed = results.filter((r) => r.status === 'rejected').length;

    return new Response(JSON.stringify({ success: true, sent: results.length - failed, failed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("send-meeting-invitation error:", err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
