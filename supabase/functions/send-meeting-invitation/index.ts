import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const APP_URL = "https://meeting.lwteensministrytrainingportal.org";
const LOGO_URL = `${APP_URL}/logo.png`;

interface InvitationRequest {
  meeting: {
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
  meeting: InvitationRequest['meeting'];
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
              <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:13px;">Connecting people across the globe</p>
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
                    <td style="padding:6px 0;color:#1a0d2e;font-family:'SFMono-Regular',Consolas,Menlo,monospace;font-weight:600;">${opts.meeting.id}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#8b8298;">Host</td>
                    <td style="padding:6px 0;color:#1a0d2e;">${opts.hostName}</td>
                  </tr>
                </table>
              </div>

              <div style="text-align:center;margin:24px 0;">
                <a href="${opts.joinLink}" style="display:inline-block;background:linear-gradient(135deg,#FF6B35,#7B2CBF);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:10px;font-weight:600;font-size:15px;box-shadow:0 6px 18px rgba(255,107,53,0.25);">
                  Join meeting
                </a>
              </div>

              <p style="font-size:13px;color:#8b8298;text-align:center;margin:14px 0 0;">
                Or paste this link in your browser:<br/>
                <a href="${opts.joinLink}" style="color:#7B2CBF;word-break:break-all;">${opts.joinLink}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;text-align:center;border-top:1px solid #efeaf6;background:#fafafa;">
              <p style="margin:0;color:#6b5e7a;font-size:12px;">© ${new Date().getFullYear()} Regal Meeting. All rights reserved.</p>
              <p style="margin:6px 0 0;color:#8b8298;font-size:12px;">Powered by <strong style="color:#7B2CBF;">Regal Network Technologies</strong></p>
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
    const { meeting, invitees, hostName = 'Your host', hostEmail } = body;

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
        subject: `${hostName} invited you: ${meeting.title}`,
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
  } catch (err: any) {
    console.error("send-meeting-invitation error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
