import { APP_URL, CALENDAR_URL, DASHBOARD_URL, PRODUCT_NAME, CALENDAR_PRODUCT_NAME } from "../brand.ts";
import { detailCard, emailLayout, escapeHtml } from "./layout.ts";

export function welcomeEmail(opts: { name?: string }) {
  const name = escapeHtml(opts.name?.trim() || "there");
  return emailLayout({
    product: "meeting",
    eyebrow: "Welcome",
    title: `You’re in, ${name}`,
    preheader: `Your ${PRODUCT_NAME} account is ready.`,
    bodyHtml: `
      <p style="margin:0 0 14px;">Your account is ready. Host HD meetings, invite anyone by email, and collaborate from anywhere.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
        <tr><td style="padding:12px 14px;background:#fff7f1;border-left:3px solid #FF6B35;border-radius:8px;">
          <strong style="color:#111;">HD Video &amp; Audio</strong>
          <div style="font-size:13px;color:#5c5c5c;margin-top:2px;">Crystal-clear calls on any network.</div>
        </td></tr>
        <tr><td style="height:8px;"></td></tr>
        <tr><td style="padding:12px 14px;background:#fff7f1;border-left:3px solid #FF6B35;border-radius:8px;">
          <strong style="color:#111;">Secure lobbies</strong>
          <div style="font-size:13px;color:#5c5c5c;margin-top:2px;">Host-controlled entry for every room.</div>
        </td></tr>
        <tr><td style="height:8px;"></td></tr>
        <tr><td style="padding:12px 14px;background:#fff7f1;border-left:3px solid #FF6B35;border-radius:8px;">
          <strong style="color:#111;">Schedule &amp; invite</strong>
          <div style="font-size:13px;color:#5c5c5c;margin-top:2px;">Plan meetings and invite anyone by email.</div>
        </td></tr>
      </table>
      <p style="margin:0;">Questions? Just reply — we read every message.</p>
    `,
    cta: { label: "Open Regal Meeting", url: DASHBOARD_URL },
    footerNote: "This welcome note was sent because you created a Regal Meeting account.",
  });
}

export function meetingInviteEmail(opts: {
  hostName: string;
  inviteeName?: string;
  title: string;
  description?: string;
  formattedDate: string;
  durationMinutes: number;
  meetingId: string;
  joinLink: string;
}) {
  const host = escapeHtml(opts.hostName);
  const who = escapeHtml(opts.inviteeName || "there");
  const title = escapeHtml(opts.title);
  const desc = opts.description ? escapeHtml(opts.description) : "";

  return emailLayout({
    product: "meeting",
    eyebrow: PRODUCT_NAME,
    title: "You’re invited",
    preheader: `${opts.hostName} invited you to “${opts.title}” on ${PRODUCT_NAME}.`,
    bodyHtml: `
      <p style="margin:0 0 12px;">Hi ${who},</p>
      <p style="margin:0 0 16px;"><strong style="color:#111;">${host}</strong> invited you to a Regal Meeting.</p>
      <h2 style="margin:0 0 8px;font-size:18px;color:#111;">${title}</h2>
      ${desc ? `<p style="margin:0 0 12px;font-size:14px;">${desc}</p>` : ""}
      ${detailCard([
        { label: "When", value: escapeHtml(opts.formattedDate) },
        { label: "Duration", value: `${opts.durationMinutes} minutes` },
        { label: "Meeting ID", value: `<span style="font-family:ui-monospace,Menlo,monospace;">${escapeHtml(opts.meetingId)}</span>` },
      ])}
      <p style="margin:0;font-size:13px;">Works on the web and the Regal Meeting mobile app.</p>
    `,
    cta: { label: "Join meeting", url: opts.joinLink },
    secondaryCta: { label: "View in calendar", url: CALENDAR_URL },
    footerNote: "You received this invite because someone shared a Regal Meeting with your email.",
  });
}

export function calendarReminderEmail(opts: {
  recipientName: string;
  title: string;
  formattedStart: string;
  formattedEnd: string;
  reminderMinutes: number;
  location?: string | null;
  description?: string | null;
  actionUrl: string;
}) {
  const name = escapeHtml(opts.recipientName || "there");
  const title = escapeHtml(opts.title);
  const rows = [
    { label: "Starts", value: escapeHtml(opts.formattedStart) },
    { label: "Ends", value: escapeHtml(opts.formattedEnd) },
  ];
  if (opts.location) rows.push({ label: "Where", value: escapeHtml(opts.location) });

  const isJoin = Boolean(opts.location?.startsWith("http"));

  return emailLayout({
    product: "calendar",
    eyebrow: CALENDAR_PRODUCT_NAME,
    title: `Starts in ${opts.reminderMinutes} min`,
    preheader: `Reminder: “${opts.title}” starts in ${opts.reminderMinutes} minutes.`,
    bodyHtml: `
      <p style="margin:0 0 12px;">Hi ${name},</p>
      <p style="margin:0 0 16px;">Here’s your reminder from ${CALENDAR_PRODUCT_NAME}.</p>
      <h2 style="margin:0 0 8px;font-size:18px;color:#111;">${title}</h2>
      ${opts.description ? `<p style="margin:0 0 12px;font-size:14px;">${escapeHtml(opts.description)}</p>` : ""}
      ${detailCard(rows)}
    `,
    cta: {
      label: isJoin ? "Join meeting" : "Open calendar",
      url: opts.actionUrl,
    },
    secondaryCta: isJoin
      ? { label: "Open calendar", url: CALENDAR_URL }
      : { label: "Open dashboard", url: DASHBOARD_URL },
    footerNote: "Reminders follow your calendar preferences. You can change them in Settings.",
  });
}

export function bookingConfirmationEmail(opts: {
  guestName?: string;
  title: string;
  formattedDate: string;
  durationMinutes: number;
  hostName?: string;
  joinLink: string;
  meetingId: string;
}) {
  const guest = escapeHtml(opts.guestName || "there");
  return emailLayout({
    product: "meeting",
    eyebrow: "Booking confirmed",
    title: "You’re booked",
    preheader: `Confirmed: “${opts.title}” — join link inside.`,
    bodyHtml: `
      <p style="margin:0 0 12px;">Hi ${guest},</p>
      <p style="margin:0 0 16px;">Your booking is confirmed. A Regal Meeting room is ready when it’s time.</p>
      ${detailCard([
        { label: "Event", value: escapeHtml(opts.title) },
        { label: "When", value: escapeHtml(opts.formattedDate) },
        { label: "Duration", value: `${opts.durationMinutes} minutes` },
        ...(opts.hostName ? [{ label: "Host", value: escapeHtml(opts.hostName) }] : []),
        { label: "Meeting ID", value: `<span style="font-family:ui-monospace,Menlo,monospace;">${escapeHtml(opts.meetingId)}</span>` },
      ])}
    `,
    cta: { label: "Join when it’s time", url: opts.joinLink },
    secondaryCta: { label: "Open Regal Meeting", url: DASHBOARD_URL },
  });
}

export function followUpScheduledEmail(opts: {
  recipientName?: string;
  title: string;
  formattedDate: string;
  priorMeetingCode: string;
  joinLink: string;
}) {
  const name = escapeHtml(opts.recipientName || "there");
  return emailLayout({
    product: "meeting",
    eyebrow: "Regal Wrap",
    title: "Follow-up scheduled",
    preheader: `Follow-up “${opts.title}” is ready.`,
    bodyHtml: `
      <p style="margin:0 0 12px;">Hi ${name},</p>
      <p style="margin:0 0 16px;">Your post-meeting follow-up from Regal Wrap is scheduled.</p>
      ${detailCard([
        { label: "Follow-up", value: escapeHtml(opts.title) },
        { label: "When", value: escapeHtml(opts.formattedDate) },
        { label: "From meeting", value: escapeHtml(opts.priorMeetingCode) },
      ])}
    `,
    cta: { label: "Open meeting link", url: opts.joinLink },
    secondaryCta: { label: "Open dashboard", url: DASHBOARD_URL },
  });
}

export function securityNoticeEmail(opts: {
  name?: string;
  headline: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
}) {
  const name = escapeHtml(opts.name || "there");
  return emailLayout({
    product: "meeting",
    eyebrow: "Security",
    title: escapeHtml(opts.headline),
    preheader: opts.headline,
    bodyHtml: `
      <p style="margin:0 0 12px;">Hi ${name},</p>
      <p style="margin:0 0 12px;">${escapeHtml(opts.body)}</p>
      <p style="margin:0;font-size:13px;">If this wasn’t you, reply to this email or contact ${escapeHtml("support@madebyregal.com")} immediately.</p>
    `,
    cta: opts.actionUrl
      ? { label: opts.actionLabel || "Review account", url: opts.actionUrl }
      : { label: "Open settings", url: `${APP_URL}/settings` },
    footerNote: "Security notices are sent for important account activity.",
  });
}
