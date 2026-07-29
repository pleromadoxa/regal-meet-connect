# Comprehensive Update Plan

A lot is bundled here — I'll execute it in a single pass, but flagging scope so nothing gets lost.

## 1. New Logo + Splash Screen
- Save uploaded icon to `src/assets/regal-logo.png` and `public/favicon.png`.
- Replace existing logo references across `AuthPage`, `MeetingHeader`, `DashboardHeader`, `Footer`, `index.html` favicon, manifest icons, and `og-image`.
- Add `src/components/SplashScreen.tsx` — full-screen brand gradient with the logo (scale + fade animation, ~1.2s), shown once on first app mount before routes render in `App.tsx`.

## 2. Settings Page Fix + Avatar Upload
- Audit `src/pages/Settings.tsx` (currently broken — likely missing route guard, missing profile fetch, or import error). Rewrite as a clean tabbed page: Profile, Notifications, Devices, Account.
- **Avatar upload**: Create `avatars` storage bucket (public) via migration with RLS (owner-write, public-read). Wire `<AvatarUpload>` to `profiles.avatar_url`. Update `useAuth` so avatar shows in headers immediately.
- Save display_name, bio, notification prefs into `profiles` (add columns if missing).

## 3. Call Screen — Google Meet Overhaul
- Replace `MeetingLayout` rendering with a new `GoogleMeetLayout`:
  - Dark canvas (#202124), rounded 12px tiles with name pill bottom-left + mic indicator, blue speaking ring.
  - Grid auto-layout: 1/2/4/6/9/12/16/25 tiles, scales gracefully via CSS grid `auto-fit minmax(clamp(140px,20vw,320px),1fr)`.
  - Active speaker promotion + tap-to-pin, sidebar strip when content shared.
  - Highly mobile responsive (1 col phone portrait, 2 col landscape, fullscreen pinned).
- `VideoControlsDock` is already Meet-styled — verify wiring (mic, cam, captions, hand, present, reactions, people, chat, more, leave) and make sure each handler is connected in `VideoConference.tsx`. Wire `onToggleParticipants`, reactions panel, hand-raise broadcast.
- Self-view PiP when local user is paginated out.
- Verify WebRTC flows: ensure local stream renders mirrored, remote audio plays (autoplay unmuted), connection state surfaces in `ConnectionQualityIndicator`.

## 4. Email System (Lovable Emails)
- Set up email infrastructure (queue, templates) via Lovable's built-in system (no Resend).
- **Welcome email** on first signup: trigger via auth-email-hook signup template OR a dedicated transactional email called from a `handle_new_user` extension. I'll use the **transactional path**: edge function `send-welcome-email` invoked from `useAuth` right after successful signup. Template uses logo, gradient header, "Welcome to Regal Meeting", taglines ("Connecting people across the globe"), CTA "Open Regal Meeting", footer "Powered by Regal Network Technologies".
- **Meeting invitation email**: replace existing `send-meeting-invitation` edge function with a beautifully branded HTML template. Triggered when host schedules a meeting / adds invitees. Includes inviter name, meeting title, date/time, meeting ID, join link, "Powered by Regal Network Technologies".
- A DB trigger on `meeting_invitations` insert calls the edge function via `pg_net` so mobile app inserts also fire the email automatically — this keeps it Supabase-realtime friendly for push notification fan-out.

## 5. Push Notifications (App-side)
- Supabase realtime subscription on `meeting_invitations` for the current user's email already powers in-app toast notifications. I'll add a `useInvitationNotifications` hook so invitees see a toast + bell badge instantly (mirrors what the mobile app will subscribe to).
- True OS push (FCM/APNs) is mobile-app territory — out of scope for the web app but the channel + table are shared so the mobile app can subscribe to the same realtime stream.

## Technical notes
- Email domain prerequisite: Lovable Emails needs a verified sender domain. If none configured, I'll prompt you with the setup dialog before deploying email functions.
- Migrations: `avatars` bucket + RLS, `profiles.bio` + `profiles.notification_prefs` columns if missing, trigger on `meeting_invitations`.
- No business-logic changes outside what's listed.

## Out of scope
- Native mobile push delivery (handled by mobile app using same Supabase channel).
- Migrating WebRTC mesh to SFU (mesh remains, paginated rendering already in place for 300+).

Approve and I'll execute end-to-end.
