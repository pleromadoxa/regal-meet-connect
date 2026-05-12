import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const APP_URL = "https://meeting.lwteensministrytrainingportal.org";
const LOGO_URL = `${APP_URL}/logo.png`;

interface WelcomeRequest {
  email: string;
  name?: string;
}

const renderHtml = (name: string) => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Welcome to Regal Meeting</title>
  </head>
  <body style="margin:0;padding:0;background:#ffffff;font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#1a1a1a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #efeaf6;">
            <tr>
              <td style="background:linear-gradient(135deg,#FF6B35 0%,#7B2CBF 100%);padding:40px 32px;text-align:center;">
                <img src="${LOGO_URL}" alt="Regal Meeting" width="72" height="72" style="display:block;margin:0 auto 16px;border-radius:16px;" />
                <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;letter-spacing:-0.3px;">Welcome to Regal Meeting</h1>
                <p style="color:rgba(255,255,255,0.92);margin:10px 0 0;font-size:15px;">Connecting people across the globe</p>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px 8px;">
                <h2 style="margin:0 0 12px;font-size:22px;color:#1a0d2e;">Hi ${name || 'there'} 👋</h2>
                <p style="font-size:15px;line-height:1.6;color:#4a4458;margin:0 0 20px;">
                  Your account is ready. Regal Meeting is your home for crystal-clear HD video, secure global meetings,
                  and seamless team collaboration — anywhere, anytime.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 24px;">
                  <tr>
                    <td style="padding:14px 16px;background:#fff7f1;border-left:3px solid #FF6B35;border-radius:8px;">
                      <strong style="color:#1a0d2e;">HD Video & Audio</strong>
                      <div style="color:#6b5e7a;font-size:13px;">Lifelike calls on any network.</div>
                    </td>
                  </tr>
                  <tr><td style="height:8px;line-height:8px;">&nbsp;</td></tr>
                  <tr>
                    <td style="padding:14px 16px;background:#f5f0ff;border-left:3px solid #7B2CBF;border-radius:8px;">
                      <strong style="color:#1a0d2e;">Enterprise Security</strong>
                      <div style="color:#6b5e7a;font-size:13px;">Encrypted, host-controlled lobbies.</div>
                    </td>
                  </tr>
                  <tr><td style="height:8px;line-height:8px;">&nbsp;</td></tr>
                  <tr>
                    <td style="padding:14px 16px;background:#eef9ff;border-left:3px solid #2196F3;border-radius:8px;">
                      <strong style="color:#1a0d2e;">Schedule & Invite</strong>
                      <div style="color:#6b5e7a;font-size:13px;">Plan meetings and invite anyone by email.</div>
                    </td>
                  </tr>
                </table>
                <div style="text-align:center;margin:28px 0 12px;">
                  <a href="${APP_URL}" style="display:inline-block;background:linear-gradient(135deg,#FF6B35,#7B2CBF);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:600;font-size:15px;box-shadow:0 6px 18px rgba(255,107,53,0.25);">
                    Open Regal Meeting
                  </a>
                </div>
                <p style="color:#8b8298;font-size:13px;text-align:center;margin:18px 0 0;">
                  Need help getting started? Just reply to this email.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px;text-align:center;border-top:1px solid #efeaf6;background:#fafafa;">
                <p style="margin:0;color:#6b5e7a;font-size:12px;">
                  © ${new Date().getFullYear()} Regal Meeting. All rights reserved.
                </p>
                <p style="margin:6px 0 0;color:#8b8298;font-size:12px;">
                  Powered by <strong style="color:#7B2CBF;">Regal Network Technologies</strong>
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

    const { email, name }: WelcomeRequest = await req.json();
    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: "Regal Meeting <onboarding@resend.dev>",
      to: [email],
      subject: "Welcome to Regal Meeting 🎉",
      html: renderHtml(name || ''),
    });

    return new Response(JSON.stringify({ success: true, id: (result as any)?.data?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-welcome-email error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
