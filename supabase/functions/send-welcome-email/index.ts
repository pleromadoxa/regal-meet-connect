import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  displayName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, displayName }: WelcomeEmailRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "Regal Meet <onboarding@resend.dev>",
      to: [email],
      subject: "Welcome to Regal Meet! 🚀",
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
                background: linear-gradient(135deg, #f97316 0%, #dc2626 100%);
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
              .button {
                display: inline-block;
                background: linear-gradient(135deg, #f97316 0%, #dc2626 100%);
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
              <h1 style="margin: 0;">Welcome to Regal Meet!</h1>
            </div>
            <div class="content">
              <h2 style="color: #333; margin-top: 0;">Hi ${displayName || 'there'},</h2>

              <p>We're thrilled to have you join the Regal Meet community! You now have access to premium video conferencing features that make collaboration seamless and secure.</p>

              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f97316;">
                <h3 style="margin-top: 0; color: #dc2626;">What you can do now:</h3>
                <ul style="padding-left: 20px;">
                  <li>🎥 Host unlimited high-quality video meetings</li>
                  <li>🔒 Experience enterprise-grade security</li>
                  <li>👥 Collaborate with your team in real-time</li>
                  <li>💬 Chat and share resources effortlessly</li>
                </ul>
              </div>

              <div style="text-align: center;">
                <a href="https://meet.regalnetwork.online/" class="button">
                  Start Your First Meeting
                </a>
              </div>

              <p>If you have any questions or need assistance, our support team is here to help.</p>

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

    return new Response(
      JSON.stringify(emailResponse),
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
