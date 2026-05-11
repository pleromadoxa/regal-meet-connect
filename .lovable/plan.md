# Plan: API Docs + 300-Participant Calls + Google Meet UI

## 1. API Documentation (MD + PDF)

Create `public/docs/regal-meeting-api.md` — a single comprehensive markdown covering:

- **Project credentials**: Supabase URL, anon key, project ref, REST/Realtime/Storage endpoints
- **Auth**: sign up, sign in, sign out, session refresh, password reset (full request/response)
- **Profiles**: read + update `profiles` (display_name, avatar_url) — including upload to `meeting-files` bucket
- **User Settings**: full CRUD on `user_settings` (theme, notifications, defaults)
- **Meetings**: create, list, join validation, update, end, delete on `meetings`
- **Scheduled Meetings**: CRUD on `scheduled_meetings` + invitations table + `send-meeting-invitation` edge function
- **Meeting Participants**: join, leave, mute toggle, list (host only), location fields
- **Recent Meetings**: `user_recent_meetings` read/insert
- **Recordings**: `meeting_recordings` + `meeting-recordings` storage bucket
- **File Sharing**: `meeting_file_shares` + `meeting-files` bucket upload/download
- **Captions**: `meeting_captions` insert/select
- **Notifications**: `notification_history`, `user_push_tokens` register/update
- **Realtime channels**:
  - `meeting-{id}` (WebRTC signaling: offer/answer/ice)
  - `meeting-lobby-{id}` (knock/admit/deny)
  - `meeting-hands-{id}` (hand raise broadcast)
  - `meeting-reactions-{id}`
  - `meeting-chat-{id}`
- **WebRTC**: STUN servers, signaling payload shapes, peer flow
- **Edge Functions**: `log-activity`, `send-meeting-invitation` (URLs, payloads)
- **Color Scheme & Design Tokens**: from `index.css` (HSL primary, secondary, accent, background, etc.)
- **Typography & UI**: fonts, button styles, gradients
- **Mobile Implementation Notes**: recommended libraries (supabase-js, @livekit or react-native-webrtc), permission flow, lobby UX

PDF generated via Python `reportlab` from same content → `public/docs/regal-meeting-api.pdf`. Both committed so they're served from `/docs/...`.

## 2. Admin Panel — API Documentation Section

Edit `src/components/AdminPanel.tsx`:
- New tab/section "API Documentation"
- Description card + two big download buttons (MD, PDF) linking to `/docs/regal-meeting-api.md` and `.pdf`
- Preview snippet showing endpoints overview

## 3. 300+ Participant WebRTC Grid

Update `src/components/meeting/ResponsiveVideoGrid.tsx`:
- Pagination concept: show first N tiles (e.g. 12 desktop / 6 mobile) of "active" participants (host + speakers + local)
- "View All Participants" button overlay when count > visible
- Modal/sheet listing all participants with avatars; clicking pins them into the visible grid
- Active speaker detection promotes speakers automatically (use existing `useSpeakingDetection`)
- Hidden participants still receive audio (don't render `<video>` tags to save GPU)

`src/hooks/useWebRTC.ts`: ensure mesh remains stable; for >50 peers, log warning recommending SFU. Document this in API docs.

## 4. Google Meet-Style UI

Edit `src/components/VideoControlsDock.tsx`:
- Pill/rounded action buttons, dark surface, white icons
- Order: Mic | Cam | Caption | Screen Share | Reactions | Raise Hand | Chat | Participants | More (settings/effects) | End Call (red)
- End-call button distinct red rounded-rectangle
- Mobile: condensed row, "More" sheet for overflow

Edit `src/components/meeting/MeetingHeader.tsx`: minimal top bar — meeting name, time, participant count chip, info button.

## 5. Self-View + Audio Verification

Already mirrors local video. Add a small self-view PiP in bottom-right when local user is hidden (paginated out).

## 6. Mobile Responsiveness

- Grid uses `clamp()`-based gap, smaller min-tile on `<640px`
- Controls dock collapses to 5 primary buttons + sheet
- Participants list becomes bottom sheet on mobile

## Files

**New**: `public/docs/regal-meeting-api.md`, `public/docs/regal-meeting-api.pdf`, `src/components/admin/ApiDocsSection.tsx`, `src/components/meeting/AllParticipantsSheet.tsx`

**Edited**: `AdminPanel.tsx`, `ResponsiveVideoGrid.tsx`, `VideoControlsDock.tsx`, `MeetingHeader.tsx`, `ParticipantGrid.tsx` (pass active-speaker info)

## Out of Scope

- Migrating mesh WebRTC to SFU (would need LiveKit/mediasoup server). Documented as recommendation in API docs for true 300-person scaling. Current mesh + lazy rendering will function but quality degrades past ~20 simultaneous video publishers — consistent with browser limits.
