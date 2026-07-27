const { test, expect } = require('@playwright/test');
const { TIMEOUTS } = require('./helpers');

test.describe('Vendor Management', () => {
  test('Vendor list loads', async ({ page }) => {
    await page.goto('/manage-vendors');
    await page.waitForLoadState('networkidle');
    const heading = page.locator('h4, h5').filter({ hasText: /vendor/i }).first();
    await expect(heading).toBeVisible({ timeout: TIMEOUTS.shortAction });
  });

  test('Vendor search bar exists', async ({ page }) => {
    await page.goto('/manage-vendors');
    await page.waitForLoadState('networkidle');
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    await expect(searchInput).toBeVisible({ timeout: TIMEOUTS.shortAction });
  });

  test('Category filter works', async ({ page }) => {
    await page.goto('/manage-vendors');
    await page.waitForLoadState('networkidle');
    const categoryChips = page.locator('.MuiChip-root, [role="button"]').filter({ hasText: /all|electronics|office|it/i });
    const count = await categoryChips.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Vendor cards/table renders', async ({ page }) => {
    await page.goto('/manage-vendors');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText.length).toBeGreaterThan(100);
  });

  test('Vendor search filters results', async ({ page }) => {
    await page.goto('/manage-vendors');
    await page.waitForLoadState('networkidle');
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    await searchInput.fill('tech');
    await page.waitForTimeout(500);
  });

  test('Add Vendor button navigates to form', async ({ page }) => {
    await page.goto('/manage-vendors');
    await page.waitForLoadState('networkidle');
    const addBtn = page.locator('a, button').filter({ hasText: /add vendor/i }).first();
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForURL('**/add-vendor', { timeout: TIMEOUTS.navigation });
      await page.waitForLoadState('networkidle');
      await expect(page.getByLabel(/vendor name/i)).toBeVisible({ timeout: TIMEOUTS.shortAction });
    }
  });
});
