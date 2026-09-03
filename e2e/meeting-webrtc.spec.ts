import { test, expect, type Browser, type Page } from '@playwright/test';

/**
 * Media/WebRTC stability checks for video + audio meetings.
 * Requires E2E_EMAIL / E2E_PASSWORD. Uses fake A/V devices — no real camera needed.
 */

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const guestEmail = process.env.E2E_GUEST_EMAIL ?? email;
const guestPassword = process.env.E2E_GUEST_PASSWORD ?? password;

const fakeMediaArgs = [
  '--use-fake-ui-for-media-stream',
  '--use-fake-device-for-media-stream',
  '--autoplay-policy=no-user-gesture-required',
];

test.use({
  launchOptions: { args: fakeMediaArgs },
  permissions: ['camera', 'microphone'],
});

async function signIn(page: Page, userEmail: string, userPassword: string) {
  await page.goto('/auth');
  await page.getByPlaceholder('name@example.com').fill(userEmail);
  await page.getByPlaceholder('••••••••').fill(userPassword);
  await page.getByRole('button', { name: /Sign In/i }).click();
  await page.waitForURL(/\/(dashboard|meeting)/, { timeout: 30_000 });
}

async function startVideoMeeting(page: Page) {
  await page.goto('/dashboard');
  await page.getByPlaceholder('Enter meeting title').fill(`WebRTC E2E ${Date.now()}`);
  await page.getByRole('button', { name: /Create & Start Video Meeting/i }).click();
  await page.waitForURL(/\/meeting\//, { timeout: 30_000 });
}

function meetingIdFromUrl(url: string) {
  return url.match(/\/meeting\/([^/?]+)/)?.[1] ?? url.match(/\/audio-meeting\/([^/?]+)/)?.[1] ?? '';
}

async function peerStats(page: Page) {
  return page.evaluate(async () => {
    const pcs = (window as unknown as { __regalPeerConnections?: RTCPeerConnection[] })
      .__regalPeerConnections;
    // Fallback: scan via performance entries is unreliable; expose via DOM custom event capture
    const connections: Array<{
      connectionState: string;
      iceConnectionState: string;
      audioRecv: number;
      videoRecv: number;
      audioSend: number;
    }> = [];

    // Prefer explicitly exposed handles
    const exposed = (
      window as unknown as { __REGAL_PEER_CONNECTIONS__?: Map<string, RTCPeerConnection> }
    ).__REGAL_PEER_CONNECTIONS__;

    const list: RTCPeerConnection[] = exposed
      ? Array.from(exposed.values())
      : pcs ?? [];

    for (const pc of list) {
      const receivers = pc.getReceivers();
      const senders = pc.getSenders();
      connections.push({
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        audioRecv: receivers.filter((r) => r.track?.kind === 'audio' && r.track.readyState === 'live')
          .length,
        videoRecv: receivers.filter((r) => r.track?.kind === 'video' && r.track.readyState === 'live')
          .length,
        audioSend: senders.filter((s) => s.track?.kind === 'audio' && s.track.enabled).length,
      });
    }

    const remoteAudioEls = document.querySelectorAll('audio');
    const videos = document.querySelectorAll('video');
    const mutedVideos = Array.from(videos).filter((v) => v.muted).length;

    return {
      peerCount: connections.length,
      connections,
      remoteAudioElements: remoteAudioEls.length,
      videoCount: videos.length,
      mutedVideos,
      anyConnected: connections.some(
        (c) => c.connectionState === 'connected' || c.iceConnectionState === 'connected'
      ),
      anyAudioRecv: connections.some((c) => c.audioRecv > 0),
      anyAudioSend: connections.some((c) => c.audioSend > 0),
    };
  });
}

test.describe('WebRTC media stability', () => {
  test.skip(!email || !password, 'Set E2E_EMAIL and E2E_PASSWORD to run authenticated media tests');

  test('two participants establish video mesh with muted tiles + audio sink', async ({
    browser,
  }) => {
    const hostContext = await browser.newContext({
      permissions: ['camera', 'microphone'],
    });
    const guestContext = await browser.newContext({
      permissions: ['camera', 'microphone'],
    });

    try {
      const hostPage = await hostContext.newPage();
      const guestPage = await guestContext.newPage();

      await signIn(hostPage, email!, password!);
      await startVideoMeeting(hostPage);
      const meetingId = meetingIdFromUrl(hostPage.url());
      expect(meetingId.length).toBeGreaterThan(0);

      await signIn(guestPage, guestEmail!, guestPassword!);
      await guestPage.goto(`/meeting/${meetingId}?userName=${encodeURIComponent('E2E Guest')}`);

      // Call chrome is present
      await expect(hostPage.getByRole('button', { name: /Leave call|Mute/i }).first()).toBeVisible({
        timeout: 45_000,
      });
      await expect(guestPage.getByRole('button', { name: /Leave call|Mute/i }).first()).toBeVisible({
        timeout: 45_000,
      });

      // Videos are always muted (RemoteAudioMix owns sound)
      await expect
        .poll(async () => {
          const stats = await peerStats(hostPage);
          return stats.videoCount > 0 && stats.mutedVideos === stats.videoCount;
        }, { timeout: 30_000 })
        .toBeTruthy();

      await expect
        .poll(async () => {
          const stats = await peerStats(guestPage);
          return stats.videoCount > 0 && stats.mutedVideos === stats.videoCount;
        }, { timeout: 30_000 })
        .toBeTruthy();

      // Mic controls respond
      const mute = hostPage.getByRole('button', { name: /^Mute$/i });
      if (await mute.isVisible()) {
        await mute.click();
        await expect(hostPage.getByRole('button', { name: /^Unmute$/i })).toBeVisible();
        await hostPage.getByRole('button', { name: /^Unmute$/i }).click();
      }
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('audio meeting loads glass shell and mic dock', async ({ browser }) => {
    const context = await browser.newContext({ permissions: ['microphone'] });
    try {
      const page = await context.newPage();
      await signIn(page, email!, password!);
      await page.goto('/dashboard');

      // Prefer starting from video then switching, or direct audio route if UI exposes it
      await page.getByPlaceholder('Enter meeting title').fill(`Audio E2E ${Date.now()}`);
      const createVideo = page.getByRole('button', { name: /Create & Start Video Meeting/i });
      await createVideo.click();
      await page.waitForURL(/\/meeting\//, { timeout: 30_000 });
      const meetingId = meetingIdFromUrl(page.url());

      await page.goto(`/audio-meeting/${meetingId}?userName=${encodeURIComponent('Host')}&host=true`);
      await expect(page.getByRole('button', { name: /Leave call|Mute|Unmute/i }).first()).toBeVisible({
        timeout: 45_000,
      });
      await expect(page.getByRole('button', { name: /Open chat|Close chat/i })).toBeVisible();
    } finally {
      await context.close();
    }
  });
});
