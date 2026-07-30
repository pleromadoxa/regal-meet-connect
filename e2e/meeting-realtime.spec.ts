import { test, expect, type Page } from '@playwright/test';

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

async function signIn(page: Page) {
  await page.goto('/auth');
  await page.getByPlaceholder('name@example.com').fill(email!);
  await page.getByPlaceholder('••••••••').fill(password!);
  await page.getByRole('button', { name: /Sign In/i }).click();
  await page.waitForURL(/\/(dashboard|meeting)/, { timeout: 30_000 });
}

async function startVideoMeeting(page: Page) {
  await page.goto('/dashboard');
  await page.getByPlaceholder('Enter meeting title').fill(`E2E ${Date.now()}`);
  await page.getByRole('button', { name: /Create & Start Video Meeting/i }).click();
  await page.waitForURL(/\/meeting\//, { timeout: 30_000 });
}

test.describe('Authenticated meeting flows', () => {
  test.skip(!email || !password, 'Set E2E_EMAIL and E2E_PASSWORD to run authenticated tests');

  test.beforeEach(async ({ context, page }) => {
    await context.grantPermissions(['camera', 'microphone']);
    await signIn(page);
  });

  test('create meeting and open chat panel', async ({ page }) => {
    await startVideoMeeting(page);

    await page.getByRole('button', { name: 'Chat' }).click();
    const chatInput = page.getByPlaceholder('Type a message…');
    await expect(chatInput).toBeVisible({ timeout: 15_000 });

    await chatInput.fill('Hello from Playwright');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByText('Hello from Playwright')).toBeVisible({ timeout: 10_000 });
  });

  test('hand raise toggles in meeting controls', async ({ page }) => {
    await startVideoMeeting(page);

    const handButton = page.getByRole('button', { name: 'Raise hand' });
    await expect(handButton).toBeVisible({ timeout: 15_000 });
    await handButton.click();
    await expect(page.getByText(/Hand Raised/i)).toBeVisible({ timeout: 10_000 });

    await handButton.click();
    await expect(page.getByText(/Hand Lowered/i)).toBeVisible({ timeout: 10_000 });
  });

  test('reaction buttons broadcast locally in meeting', async ({ page }) => {
    await startVideoMeeting(page);

    const heartButton = page.getByRole('button', { name: 'Send heart reaction' });
    await expect(heartButton).toBeVisible({ timeout: 15_000 });
    await heartButton.click();
    await expect(page.locator('text=❤️').first()).toBeVisible();
  });
});
