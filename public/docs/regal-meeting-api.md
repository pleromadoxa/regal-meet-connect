# Regal Meeting — Mobile App API Documentation

**Version:** 2.0  
**Last updated:** 2026-08-03  
**Audience:** AI agents and engineers maintaining the **Regal Meeting** mobile companion (`regal-meeting-mobile`, Expo / React Native).

This document is the source of truth for syncing the mobile app with the web app at **https://meet.regalmesh.com**. Both clients share one Supabase backend (Regal Mail project).

---

## 1. Project Identity & Endpoints

| Item | Value |
|---|---|
| Product name | **Regal Meeting** |
| Company | **Spatial Regal** Digital Ltd |
| Web app | `https://meet.regalmesh.com` |
| Deep link scheme | `regalmeet://` |
| Universal links | `https://meet.regalmesh.com/meeting/{CODE}` |
| Supabase project ref | `xexnwcmqnelgzuqhkvtx` |
| Supabase URL | `https://xexnwcmqnelgzuqhkvtx.supabase.co` |
| Edge Functions base | `https://xexnwcmqnelgzuqhkvtx.supabase.co/functions/v1` |

> ✅ Use the publishable (anon) key from the Supabase dashboard. Never embed the service-role key.  
> ✅ Auth and Meeting data live in the **same** project as Regal Mail (`@regalmail.me`).

### Mobile env (`EXPO_PUBLIC_*`)

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Shared Supabase URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Publishable key |
| `EXPO_PUBLIC_MEET_URL` | `https://meet.regalmesh.com` |
| `EXPO_PUBLIC_R2_PUBLIC_URL` | Optional R2 CDN |
| `EXPO_PUBLIC_TURN_URLS` | Comma-separated TURN URLs (parity with web `VITE_TURN_*`) |
| `EXPO_PUBLIC_TURN_USERNAME` / `_CREDENTIAL` | TURN credentials |

---

## 2. Authentication

### 2.1 Email / password
Standard Supabase Auth (`signUp` / `signInWithPassword` / `signOut` / password reset).  
Mobile redirect: `regalmeet://auth-callback`.

### 2.2 Regal Mail SSO
Accounts on `@regalmail.me` use the same Supabase project — no bridge needed when unified.

- Password: `signInWithPassword` with a normalized `@regalmail.me` address  
- Magic link: `signInWithOtp` → `regalmeet://auth-callback?provider=regal-mail`

Web uses the same rules (`regal-mail-bridge` only if Meeting/Mail projects diverge).

---

## 3. Plans & billing

Edge Function: **`meeting-billing`**

Plan IDs: `free` | `pro` | `vault_plus` | `ultra` | `business_education` | `business_corporate` | `team`

| Plan | Max participants | Duration | SFU | Recording |
|---|---|---|---|---|
| free | 110 | 60 min | no | no |
| pro | 200 | 8 h | yes | yes |
| business_education | 300 | 8 h | yes | yes |
| vault_plus / ultra / team / business_corporate | 500 | up to 24 h | yes | yes |

Upgrade UX: open `https://regalmesh.com/dashboard?upgrade=pro` (Paystack on Regal Cloud).

Enforce on mobile: host plan limits duration, screen share, recording, and SFU eligibility (same as web).

---

## 4. Meetings

Tables: `meetings`, `meeting_participants`, `scheduled_meetings`, `user_recent_meetings`, …  
Lookup RPC / helper: `get_meeting_by_code` / `fetchMeetingByCode`.

Invite link format:

```
https://meet.regalmesh.com/meeting/{CODE}
regalmeet://meeting/{CODE}
```

Encrypted mobile-only P2P rooms: codes starting with `CALL-` (web must not initiate these).

---

## 5. Lobby

Realtime channel: `lobby-{meetingCode}`  
Events: `knock`, `admit`, `deny` — same payload shape as web.

---

## 6. WebRTC signalling (web ↔ mobile)

Channel: `meeting-{meetingCode}`

### Interop rule
Clients **must** dual-emit web + mobile events via `buildOutboundBroadcasts` / `normalizeInboundSignal` (`webrtcSignaling.ts`):

| Logical type | Web event | Mobile legacy events |
|---|---|---|
| join / rejoin | `signaling` `{type:'rejoin'}` | `peer-join` |
| leave | `signaling` `{type:'leave'}` | `peer-leave` |
| offer / answer | `signaling` + typed data | `offer` / `answer` |
| ICE | `signaling` `{type:'ice-candidate'}` | `ice` and `ice-candidate` |

ICE servers: STUN (Google + Cloudflare + Twilio) + project TURN; fallback openrelay TURN when unset (`iceServers.ts`).

---

## 7. Media topology

Threshold: **12** participants → leave full mesh (`SFU_AUTO_THRESHOLD`).

| Mode | Behavior |
|---|---|
| `mesh` | Full P2P (≤12) |
| `sfu` | Cloudflare Realtime SFU via Edge Function `meeting-sfu` |
| `host-hub` | Fallback when SFU unavailable / plan lacks SFU |

Topology channel: `meeting-topology-{meetingId}` event `topology`.  
SFU registry: `meeting-sfu-registry-{meetingId}` events `tracks-published`, `request-tracks`.

Mobile ports: `lib/cloudflareSfu.ts`, `hooks/useCloudflareSfu.ts`, `hooks/useMeetingTopology.ts`.

---

## 8. File sharing & R2

Edge Functions: `meeting-r2` (presign), `cloudflare-health`.  
Folders: `avatars`, `meeting-files`. Same pipeline on web and mobile.

---

## 9. Chat, hands, reactions, presentation, pin

| Feature | Channel | Event(s) |
|---|---|---|
| Chat | `meeting-chat-{code}` | `message` |
| Hands | `meeting-hands-{code}` | `hand-raised` |
| Reactions | `meeting-reactions-{code}` | reaction broadcast |
| Presentation | present channel | start / stop present |
| Pin | pin channel | pin target |

---

## 10. Captions

Table: `meeting_captions`  
Realtime: `postgres_changes` INSERT on `meeting_id`.

- Web: Web Speech API producer + display  
- Mobile: display + typed caption producer (shared DB so both platforms see the same lines)

---

## 11. Recordings

Table: `meeting_recordings`  
Host-only; gated by plan `recording`.

- Web: canvas composite + MediaRecorder → upload  
- Mobile: local audio capture (expo-av) → R2 upload + same row status lifecycle

---

## 12. Mobile-only features

Keep on mobile (do not require on web):

- Regal Number dialer (`user_phone_numbers`)
- Encrypted P2P `CALL-*` rooms / `app_calls`
- Contacts, invite ring, biometrics, Expo push, background call handling

Edge Functions (mobile): `initiate-app-call`, `notify-meeting-ring`.

---

## 13. Profiles, settings, notifications

Aligned with web tables: `profiles`, `user_settings`, notifications / push tokens.  
Activity logging helper shared conceptually with web `logActivity`.

---

## 14. Branding

| Item | Value |
|---|---|
| Domain | `meet.regalmesh.com` / `regalmesh.com` |
| Company | Spatial Regal |
| Accent | `#ff5c28` (primary orange) |
| Dark chrome | `#0c0e15` splash / backgrounds |

---

## 15. Parity checklist (mobile sync)

- [x] Domain / deep links → `meet.regalmesh.com`
- [x] Dual signalling with web
- [x] Shared ICE / TURN config
- [x] SFU + topology
- [x] Plan limits + Regal One panel
- [x] Regal Mail sign-in
- [x] Captions subscribe + publish
- [x] Recording (host, plan-gated)
- [x] R2 file/avatar uploads
- [x] Spatial Regal branding

---

## 16. Recommended SDKs

| Platform | Packages |
|---|---|
| React Native (Expo) | `@supabase/supabase-js`, `react-native-webrtc`, `react-native-url-polyfill`, Expo Router |

Init:

```ts
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: true, autoRefreshToken: true } }
);
```
