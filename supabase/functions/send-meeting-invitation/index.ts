import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MeetingInvitationRequest {
  meeting: {
    id: string;
    title: string;
    description?: string;
    scheduledTime: string;
    duration: number;
    link: string;
  };
  invitees: string[];
  hostEmail?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { meeting, invitees, hostEmail }: MeetingInvitationRequest = await req.json();

    const scheduledDate = new Date(meeting.scheduledTime);
    const formattedDate = scheduledDate.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    const emailPromises = invitees.map(email =>
      resend.emails.send({
        from: "Regal Meet <onboarding@resend.dev>",
        to: [email],
        subject: `Meeting Invitation: ${meeting.title}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body {
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                }
                .header {
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  padding: 30px;
                  border-radius: 10px 10px 0 0;
                  text-align: center;
                }
                .content {
                  background: #f8f9fa;
                  padding: 30px;
                  border-radius: 0 0 10px 10px;
                }
                .meeting-details {
                  background: white;
                  padding: 20px;
                  border-radius: 8px;
                  margin: 20px 0;
                  border-left: 4px solid #667eea;
                }
                .detail-row {
                  margin: 12px 0;
                  display: flex;
                  align-items: center;
                }
                .detail-label {
                  font-weight: bold;
                  color: #667eea;
                  min-width: 100px;
                }
                .join-button {
                  display: inline-block;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  padding: 15px 40px;
                  text-decoration: none;
                  border-radius: 8px;
                  font-weight: bold;
                  margin: 20px 0;
                  text-align: center;
                }
                .footer {
                  text-align: center;
                  color: #666;
                  font-size: 12px;
                  margin-top: 30px;
                  padding-top: 20px;
                  border-top: 1px solid #ddd;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1 style="margin: 0;">📅 Meeting Invitation</h1>
              </div>
              <div class="content">
                <h2 style="color: #333; margin-top: 0;">${meeting.title}</h2>
                
                ${meeting.description ? `<p style="color: #666;">${meeting.description}</p>` : ''}
                
                <div class="meeting-details">
                  <div class="detail-row">
                    <span class="detail-label">🗓️ When:</span>
                    <span>${formattedDate}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">⏱️ Duration:</span>
                    <span>${meeting.duration} minutes</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">🔗 Meeting ID:</span>
                    <span><code>${meeting.id}</code></span>
                  </div>
                  ${hostEmail ? `
                  <div class="detail-row">
                    <span class="detail-label">👤 Host:</span>
                    <span>${hostEmail}</span>
                  </div>
                  ` : ''}
                </div>
                
                <div style="text-align: center;">
                  <a href="${meeting.link}" class="join-button">
                    Join Meeting
                  </a>
                </div>
                
                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                  <strong>Alternative ways to join:</strong><br>
                  Copy and paste this link in your browser:<br>
                  <a href="${meeting.link}" style="color: #667eea;">${meeting.link}</a>
                </p>
                
                <div class="footer">
                  <p>
                    <strong>Regal Meet</strong> - Connecting people across the globe<br>
                    © 2025 Regal Network Technologies. All rights reserved.
                  </p>
                  <p style="margin-top: 10px;">
                    If you have any questions, please contact the meeting host.
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
      })
    );

    const results = await Promise.allSettled(emailPromises);
    const failed = results.filter(r => r.status === 'rejected');

    if (failed.length > 0) {
      console.error('Some emails failed to send:', failed);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: results.length - failed.length,
        failed: failed.length
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-meeting-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);