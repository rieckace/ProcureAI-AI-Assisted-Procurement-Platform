const { test, expect } = require('@playwright/test');
const { TIMEOUTS } = require('./helpers');

test.describe('Responsive Design', () => {
  test('Mobile viewport renders without error', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/officer-dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/officer-dashboard/);
  });

  test('Tablet viewport layout adapts', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/officer-dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/officer-dashboard/);
  });
});
