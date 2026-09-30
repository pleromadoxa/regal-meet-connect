import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { APP_URL, REPLY_TO_EMAIL } from "../_shared/brand.ts";
import { sendMail, zipperConfigured } from "../_shared/mail.ts";
import { meetingInviteEmail, bookingConfirmationEmail } from "../_shared/email-templates/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  scheduledMeetingId?: string;
  kind?: "invite" | "booking";
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!zipperConfigured()) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: InvitationRequest = await req.json();
    let { meeting, invitees, hostName, hostEmail } = body;
    const kind = body.kind === "booking" ? "booking" : "invite";

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
      if (!hostName) {
        // Try to resolve the host's display name from their profile
        const { data: hostProfile } = await admin
          .from("profiles")
          .select("display_name")
          .eq("id", row.host_id)
          .maybeSingle();
        hostName = hostProfile?.display_name?.trim() || hostEmail?.split("@")[0] || "Host";
      }
    }

    if (!hostName) hostName = "Host";

    if (!meeting) {
      return new Response(JSON.stringify({ error: "Missing meeting payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const scheduled = new Date(meeting.scheduledTime);
    const formattedDate = scheduled.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
    const joinLink = meeting.link || `${APP_URL}/meeting/${meeting.id}`;

    const results = await Promise.allSettled(
      invitees.map(async (entry) => {
        const email = typeof entry === "string" ? entry : entry.email;
        const name = typeof entry === "string" ? undefined : entry.name;
        const content =
          kind === "booking"
            ? bookingConfirmationEmail({
                guestName: name,
                title: meeting!.title,
                formattedDate,
                durationMinutes: meeting!.duration,
                hostName,
                joinLink,
                meetingId: meeting!.id,
              })
            : meetingInviteEmail({
                hostName,
                inviteeName: name,
                title: meeting!.title,
                description: meeting!.description,
                formattedDate,
                durationMinutes: meeting!.duration,
                meetingId: meeting!.id,
                joinLink,
              });
        const result = await sendMail({
          to: email,
          subject:
            kind === "booking"
              ? `Confirmed: ${meeting!.title}`
              : `${hostName} invited you: ${meeting!.title}`,
          html: content.html,
          text: content.text,
          product: kind === "booking" ? "calendar" : "meeting",
          replyTo: hostEmail || REPLY_TO_EMAIL,
          idempotencyKey: `${kind}-${meeting!.id}-${email}-${meeting!.scheduledTime}`,
        });
        if (!result.ok) throw new Error(result.error || "send failed");
        return result;
      })
    );

    const failed = results.filter((r) => r.status === "rejected").length;

    return new Response(
      JSON.stringify({ success: true, sent: results.length - failed, failed }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("send-meeting-invitation error:", err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
