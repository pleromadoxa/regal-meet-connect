import { test, expect, type Browser, type Page } from '@playwright/test';

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const guestEmail = process.env.E2E_GUEST_EMAIL ?? email;
const guestPassword = process.env.E2E_GUEST_PASSWORD ?? password;

async function signIn(page: Page, userEmail: string, userPassword: string) {
  await page.goto('/auth');
  await page.getByPlaceholder('name@example.com').fill(userEmail);
  await page.getByPlaceholder('••••••••').fill(userPassword);
  await page.getByRole('button', { name: /Sign In/i }).click();
  await page.waitForURL(/\/(dashboard|meeting)/, { timeout: 30_000 });
}

async function startVideoMeeting(page: Page) {
  await page.goto('/dashboard');
  await page.getByPlaceholder('Enter meeting title').fill(`E2E ${Date.now()}`);
  await page.getByRole('button', { name: /Create & Start Video Meeting/i }).click();
  await page.waitForURL(/\/meeting\//, { timeout: 30_000 });
}

function meetingIdFromUrl(url: string) {
  return url.match(/\/meeting\/([^/?]+)/)?.[1] ?? '';
}

async function joinMeetingAsGuest(guestPage: Page, meetingId: string, guestName: string) {
  await guestPage.goto(`/meeting/${meetingId}?userName=${encodeURIComponent(guestName)}`);
  await expect(guestPage.getByRole('button', { name: 'Raise hand' })).toBeVisible({ timeout: 45_000 });
}

async function createHostGuestPages(browser: Browser) {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  await hostContext.grantPermissions(['camera', 'microphone']);
  await guestContext.grantPermissions(['camera', 'microphone']);

  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  await signIn(hostPage, email!, password!);
  await startVideoMeeting(hostPage);

  const meetingId = meetingIdFromUrl(hostPage.url());
  expect(meetingId.length).toBeGreaterThan(0);

  await signIn(guestPage, guestEmail!, guestPassword!);
  await joinMeetingAsGuest(guestPage, meetingId, 'E2E Guest');

  return {
    hostContext,
    guestContext,
    hostPage,
    guestPage,
    meetingId,
    cleanup: async () => {
      await hostContext.close();
      await guestContext.close();
    },
  };
}

test.describe('Multi-user meeting realtime', () => {
  test.skip(!email || !password, 'Set E2E_EMAIL and E2E_PASSWORD to run authenticated tests');

  test('guest chat message appears for host', async ({ browser }) => {
    const session = await createHostGuestPages(browser);

    try {
      await session.guestPage.getByRole('button', { name: 'Chat' }).click();
      await session.guestPage.getByPlaceholder('Type a message…').fill('Cross-user hello');
      await session.guestPage.getByRole('button', { name: 'Send message' }).click();

      await session.hostPage.getByRole('button', { name: 'Chat' }).click();
      await expect(session.hostPage.getByText('Cross-user hello')).toBeVisible({ timeout: 20_000 });
    } finally {
      await session.cleanup();
    }
  });

  test('guest hand raise notifies host', async ({ browser }) => {
    const session = await createHostGuestPages(browser);

    try {
      await session.guestPage.getByRole('button', { name: 'Raise hand' }).click();
      await expect(session.hostPage.getByText(/E2E Guest has raised their hand/i)).toBeVisible({
        timeout: 20_000,
      });
    } finally {
      await session.cleanup();
    }
  });
});
