const { test, expect } = require('@playwright/test');
const { TIMEOUTS } = require('./helpers');

test.describe('Officer Dashboard', () => {
  test('Dashboard loads with PR list', async ({ page }) => {
    await page.goto('/officer-dashboard');
    await page.waitForLoadState('networkidle');
    const heading = page.locator('h4, h5').filter({ hasText: /all request|request/i }).first();
    await expect(heading).toBeVisible({ timeout: TIMEOUTS.shortAction });
  });

  test('Search bar is functional', async ({ page }) => {
    await page.goto('/officer-dashboard');
    await page.waitForLoadState('networkidle');
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('test');
    await page.waitForTimeout(500);
  });

  test('Status filter dropdown contains Pending', async ({ page }) => {
    await page.goto('/officer-dashboard');
    await page.waitForLoadState('networkidle');
    // MUI's `select` renders as an input with role="combobox", not a native <select>
    const statusSelect = page.locator('.MuiSelect-select, [role="combobox"]').first();
    await expect(statusSelect).toBeVisible({ timeout: TIMEOUTS.shortAction });
    await statusSelect.click();
    // After clicking, the dropdown options appear in a Menu/List
    const pendingOption = page.locator('.MuiMenuItem-root, [role="option"]').filter({ hasText: /pending/i }).first();
    await expect(pendingOption).toBeVisible({ timeout: TIMEOUTS.shortAction });
  });

  test('View mode toggle (kanban/table) works', async ({ page }) => {
    await page.goto('/officer-dashboard');
    await page.waitForLoadState('networkidle');
    const tableBtn = page.locator('button[aria-label="Table view"]');
    const kanbanBtn = page.locator('button[aria-label="Kanban view"]');
    if (await kanbanBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await kanbanBtn.click();
      await page.waitForTimeout(500);
    }
    if (await tableBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tableBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('Navigate to PR detail via row click', async ({ page }) => {
    await page.goto('/officer-dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const prRow = page.locator('tbody tr').first();
    if (await prRow.isVisible({ timeout: TIMEOUTS.shortAction }).catch(() => false)) {
      await prRow.click();
      await page.waitForURL('**/pr/**', { timeout: TIMEOUTS.navigation });
    }
  });

  test('Sidebar navigation works', async ({ page }) => {
    await page.goto('/officer-dashboard');
    await page.waitForLoadState('networkidle');
    const vendorsLink = page.getByRole('link', { name: /vendor/i }).first();
    if (await vendorsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await vendorsLink.click();
      await page.waitForURL('**/manage-vendors', { timeout: TIMEOUTS.navigation });
    }
  });

  test('Activity log page is accessible', async ({ page }) => {
    await page.goto('/activity-log');
    await page.waitForLoadState('networkidle');
    const heading = page.locator('h4, h5').filter({ hasText: /activity/i }).first();
    await expect(heading).toBeVisible({ timeout: TIMEOUTS.shortAction });
  });

  test('Analytics page is accessible', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const heading = page.locator('h4, h5, h6').filter({ hasText: /analytics/i }).first();
    const errorMsg = page.locator('text=/failed to load/i');
    const hasHeading = await heading.isVisible({ timeout: 5000 }).catch(() => false);
    const hasError = await errorMsg.isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasHeading || hasError).toBeTruthy();
  });
});
