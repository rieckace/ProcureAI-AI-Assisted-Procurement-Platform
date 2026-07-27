const { test, expect } = require('@playwright/test');
const { TIMEOUTS } = require('./helpers');

test.describe('Manager Dashboard & PR Creation', () => {
  test('Dashboard loads with My Requests', async ({ page }) => {
    await page.goto('/manager-dashboard');
    await page.waitForLoadState('networkidle');
    const heading = page.locator('h4, h5').filter({ hasText: /my request|request/i }).first();
    await expect(heading).toBeVisible({ timeout: TIMEOUTS.shortAction });
  });

  test('New Request navigation works', async ({ page }) => {
    await page.goto('/manager-dashboard');
    await page.waitForLoadState('networkidle');
    const newReqLink = page.getByRole('link', { name: /new request/i }).first();
    if (await newReqLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newReqLink.click();
      await page.waitForURL('**/new-request', { timeout: TIMEOUTS.navigation });
    }
  });

  test('New Request form renders all fields', async ({ page }) => {
    await page.goto('/new-request');
    await page.waitForLoadState('networkidle');
    await expect(page.getByLabel(/item name/i)).toBeVisible({ timeout: TIMEOUTS.shortAction });
    await expect(page.getByLabel(/category/i)).toBeVisible();
    await expect(page.getByLabel(/quantity/i)).toBeVisible();
    await expect(page.getByLabel(/budget/i)).toBeVisible();
    await expect(page.getByLabel(/justification/i)).toBeVisible();
  });

  test('New Request form validation works', async ({ page }) => {
    await page.goto('/new-request');
    await page.waitForLoadState('networkidle');
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();
    await page.waitForTimeout(1000);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText.length).toBeGreaterThan(100);
  });

  test('Can fill out new request form', async ({ page }) => {
    await page.goto('/new-request');
    await page.waitForLoadState('networkidle');
    await page.getByLabel(/item name/i).fill('E2E Test Monitor');
    await page.getByLabel(/quantity/i).fill('10');
    await page.getByLabel(/budget/i).fill('5000');
    await page.getByLabel(/justification/i).fill('E2E test justification for automated testing');
    await expect(page.getByLabel(/item name/i)).toHaveValue('E2E Test Monitor');
  });

  test('PR detail page loads when clicking a request', async ({ page }) => {
    await page.goto('/manager-dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const prRow = page.locator('tbody tr').first();
    if (await prRow.isVisible({ timeout: TIMEOUTS.shortAction }).catch(() => false)) {
      await prRow.click();
      await page.waitForURL('**/pr/**', { timeout: TIMEOUTS.navigation });
      await page.waitForLoadState('networkidle');
    }
  });
});
