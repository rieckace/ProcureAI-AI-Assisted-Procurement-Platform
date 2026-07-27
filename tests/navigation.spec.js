const { test, expect } = require('@playwright/test');
const { TIMEOUTS } = require('./helpers');

test.describe('Layout & Navigation', () => {
  test('Sidebar renders', async ({ page }) => {
    await page.goto('/officer-dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const sidebarText = page.locator('text=/navigation/i').first();
    await expect(sidebarText).toBeVisible({ timeout: TIMEOUTS.shortAction });
  });

  test('Sidebar has navigation items', async ({ page }) => {
    await page.goto('/officer-dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const allRequests = page.getByRole('button', { name: /all requests/i });
    const vendors = page.getByRole('button', { name: /vendors/i });
    const hasAll = await allRequests.isVisible({ timeout: 3000 }).catch(() => false);
    const hasVendors = await vendors.isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasAll || hasVendors).toBeTruthy();
  });

  test('App title/logo is visible in header', async ({ page }) => {
    await page.goto('/officer-dashboard');
    await page.waitForLoadState('networkidle');
    const logo = page.locator('text=/procura|procureai/i').first();
    await expect(logo).toBeVisible({ timeout: TIMEOUTS.shortAction });
  });

  test('User avatar/name exists in header', async ({ page }) => {
    await page.goto('/officer-dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const userBtn = page.getByRole('button', { name: /Sarah Officer|Admin User|Mike Manager/i }).first();
    await expect(userBtn).toBeVisible({ timeout: TIMEOUTS.shortAction });
  });
});
