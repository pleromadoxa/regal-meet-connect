import { test, expect } from '@playwright/test';

test.describe('Public pages', () => {
  test('join page shows quick join form with prefilled code', async ({ page }) => {
    await page.goto('/join/ABCD1234');

    await expect(page.getByRole('heading', { name: 'Join a Meeting' })).toBeVisible();
    await expect(page.getByPlaceholder('How you\'ll appear in the call')).toBeVisible();
    await expect(page.getByPlaceholder('ABC12XYZ or invite URL')).toHaveValue('ABCD1234');
    await expect(page.getByRole('button', { name: /Join now/i })).toBeVisible();
  });

  test('auth page uses Regal Mail sign-in', async ({ page }) => {
    await page.goto('/auth');

    await expect(page.getByRole('heading', { name: /Sign in with Regal Mail/i })).toBeVisible();
    await expect(page.getByPlaceholder(`you@${'regalmail.me'}`)).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign in with Regal Mail/i })).toBeVisible();
  });

  test('privacy page loads', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.locator('body')).toContainText(/privacy/i);
  });

  test('join redirects unauthenticated user to auth', async ({ page }) => {
    await page.goto('/join/TESTMEET');

    await page.getByPlaceholder('How you\'ll appear in the call').fill('E2E Guest');
    await page.getByRole('button', { name: /Join now/i }).click();

    await expect(page).toHaveURL(/\/auth\?redirect=/);
  });
});
