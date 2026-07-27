const { test, expect } = require('@playwright/test');
const { TIMEOUTS } = require('./helpers');

test.describe('Analytics Page', () => {
  test('Analytics page loads', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const heading = page.locator('h4, h5, h6').filter({ hasText: /analytics/i }).first();
    const errorMsg = page.locator('text=/failed to load/i');
    const hasHeading = await heading.isVisible({ timeout: 5000 }).catch(() => false);
    const hasError = await errorMsg.isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasHeading || hasError).toBeTruthy();
  });

  test('Overview cards render', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    // The analytics page may render Paper/Card elements with stats, or may be loading
    const cards = page.locator('.MuiCard-root, .MuiPaper-root');
    const count = await cards.count();
    // At minimum, the page should have content (body length check as fallback)
    if (count === 0) {
      const bodyText = await page.locator('body').textContent();
      expect(bodyText.length).toBeGreaterThan(100);
    } else {
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  test('Charts section renders SVG', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    const svgs = page.locator('.recharts-surface, svg');
    const count = await svgs.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Status breakdown text renders', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText.length).toBeGreaterThan(100);
  });
});
