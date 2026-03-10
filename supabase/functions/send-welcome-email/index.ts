import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const APP_URL = Deno.env.get("APP_URL") || "https://meet.regalnetwork.online/";
const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL") || "Regal Meet <onboarding@resend.dev>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  display_name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, display_name }: WelcomeEmailRequest = await req.json();

    console.log(`Sending welcome email to: ${email}`);

    const { data, error } = await resend.emails.send({
      from: SENDER_EMAIL,
      to: [email],
      subject: "Welcome to Regal Meet!",
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
                background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
                color: white;
                padding: 40px;
                border-radius: 10px 10px 0 0;
                text-align: center;
              }
              .content {
                background: #f8f9fa;
                padding: 30px;
                border-radius: 0 0 10px 10px;
                border: 1px solid #e2e8f0;
                border-top: none;
              }
              .welcome-card {
                background: white;
                padding: 25px;
                border-radius: 8px;
                margin: 20px 0;
                border-left: 4px solid #f97316;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
              }
              .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
                color: white !important;
                padding: 15px 40px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                margin: 20px 0;
                text-align: center;
              }
              .footer {
                text-align: center;
                color: #64748b;
                font-size: 12px;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e2e8f0;
              }
              .feature-list {
                list-style: none;
                padding: 0;
              }
              .feature-item {
                margin: 10px 0;
                padding-left: 25px;
                position: relative;
              }
              .feature-item:before {
                content: "✓";
                position: absolute;
                left: 0;
                color: #f97316;
                font-weight: bold;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">👑 Welcome to Regal Meet</h1>
            </div>
            <div class="content">
              <h2 style="color: #1e293b; margin-top: 0;">Hello ${display_name || 'there'}!</h2>

              <p>We're thrilled to have you join Regal Meet, the premium video conferencing platform designed for seamless connection and collaboration.</p>

              <div class="welcome-card">
                <h3 style="margin-top: 0; color: #f97316;">Get Started Today</h3>
                <ul class="feature-list">
                  <li class="feature-item">High-quality HD video and crystal clear audio</li>
                  <li class="feature-item">Instant screen sharing and real-time chat</li>
                  <li class="feature-item">Secure meetings with waiting room controls</li>
                  <li class="feature-item">Record meetings for later viewing</li>
                </ul>
              </div>

              <div style="text-align: center;">
                <a href="${APP_URL}" class="cta-button">
                  Go to Dashboard
                </a>
              </div>

              <p style="color: #475569; font-size: 15px;">
                Your account is ready to use! No verification is required. You can start or join your first meeting immediately.
              </p>

              <div class="footer">
                <p>
                  <strong>Regal Meet</strong> - Connecting people across the globe<br>
                  © 2025 Regal Network Technologies. All rights reserved.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error from Resend:', error);
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true, messageId: data?.id }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
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
