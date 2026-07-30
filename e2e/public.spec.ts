import { test, expect } from '@playwright/test';

test.describe('Public pages', () => {
  test('join page shows quick join form with prefilled code', async ({ page }) => {
    await page.goto('/join/ABCD1234');

    await expect(page.getByRole('heading', { name: 'Join a Meeting' })).toBeVisible();
    await expect(page.getByPlaceholder('How you\'ll appear in the call')).toBeVisible();
    await expect(page.getByPlaceholder('ABC12XYZ or invite URL')).toHaveValue('ABCD1234');
    await expect(page.getByRole('button', { name: /Join now/i })).toBeVisible();
  });

  test('auth page renders sign-in form', async ({ page }) => {
    await page.goto('/auth');

    await expect(page.getByPlaceholder('name@example.com')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
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
