import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { REPLY_TO_EMAIL } from "../_shared/brand.ts";
import { sendMail, zipperConfigured } from "../_shared/mail.ts";
import { welcomeEmail } from "../_shared/email-templates/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeRequest {
  email: string;
  name?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!zipperConfigured()) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, name }: WelcomeRequest = await req.json();
    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = welcomeEmail({ name });
    const result = await sendMail({
      to: email,
      subject: "Welcome to Regal Meeting",
      html: content.html,
      text: content.text,
      product: "meeting",
      replyTo: REPLY_TO_EMAIL,
      idempotencyKey: `welcome-${email.toLowerCase()}`,
    });

    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: result.status ?? 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("send-welcome-email error:", err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
