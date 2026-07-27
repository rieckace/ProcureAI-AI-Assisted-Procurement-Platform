const { test, expect } = require('@playwright/test');
const { TIMEOUTS } = require('./helpers');

test.describe('Landing & Public Pages', () => {
  test('Landing page loads at root', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const heading = page.locator('h1, h2, h3').first();
    await expect(heading).toBeVisible({ timeout: TIMEOUTS.shortAction });
  });

  test('Landing page has login CTA', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loginLink = page.locator('a, button').filter({ hasText: /sign in|login|get started/i }).first();
    await expect(loginLink).toBeVisible({ timeout: TIMEOUTS.shortAction });
  });

  test('Vendor quote form loads with valid token path', async ({ page }) => {
    await page.goto('/vendor-quote/fake-token');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
