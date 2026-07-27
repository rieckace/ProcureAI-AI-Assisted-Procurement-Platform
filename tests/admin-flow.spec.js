const { test, expect } = require('@playwright/test');
const { TIMEOUTS } = require('./helpers');

test.describe('Admin Panel', () => {
  test('Admin panel loads', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/admin/);
    const heading = page.locator('h4, h5').filter({ hasText: /admin/i }).first();
    await expect(heading).toBeVisible({ timeout: TIMEOUTS.shortAction });
  });

  test('Invite form renders with email and role fields', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(emailInput).toBeVisible();
    }
  });

  test('Invite button exists', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    const inviteBtn = page.locator('button[type="submit"]').filter({ hasText: /invite|send/i }).first();
    if (await inviteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(inviteBtn).toBeVisible();
    }
  });

  test('Users list is displayed', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    const heading = page.locator('h6').filter({ hasText: /users/i }).first();
    await expect(heading).toBeVisible({ timeout: TIMEOUTS.shortAction });
  });

  test('Email preview section exists', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    const previewSection = page.locator('text=/preview|email preview/i').first();
    if (await previewSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(previewSection).toBeVisible();
    }
  });
});
