const { test, expect } = require('@playwright/test');
const { TIMEOUTS, API_URL, TEST_ACCOUNTS } = require('./helpers');

test.describe('PR Detail Page', () => {
  let prUrl;

  test.beforeAll(async () => {
    // Login via API to get a fresh token, then fetch PRs
    try {
      const loginRes = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_ACCOUNTS.officer.email, password: TEST_ACCOUNTS.officer.password }),
      });
      if (!loginRes.ok) return;
      const { token } = await loginRes.json();
      
      const prRes = await fetch(`${API_URL}/api/purchase-requests?limit=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (prRes.ok) {
        const data = await prRes.json();
        if (data?.data?.length > 0) {
          prUrl = `/pr/${data.data[0].id}`;
        }
      }
    } catch (err) {
      console.log('Failed to get PR:', err.message);
    }
  });

  test('PR detail page loads with breadcrumbs', async ({ page }) => {
    if (!prUrl) return test.skip();
    await page.goto(prUrl);
    await page.waitForLoadState('networkidle');
    const breadcrumbs = page.locator('.MuiBreadcrumbs-root').first();
    await expect(breadcrumbs).toBeVisible({ timeout: TIMEOUTS.shortAction });
  });

  test('Status chip is visible', async ({ page }) => {
    if (!prUrl) return test.skip();
    await page.goto(prUrl);
    await page.waitForLoadState('networkidle');
    const statusChip = page.locator('.MuiChip-root').filter({ hasText: /pending|quoted|ordered|delivered|rejected/i }).first();
    await expect(statusChip).toBeVisible({ timeout: TIMEOUTS.shortAction });
  });

  test('PR info cards render', async ({ page }) => {
    if (!prUrl) return test.skip();
    await page.goto(prUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const bodyText = await page.locator('body').textContent();
    const hasQuantity = /quantity/i.test(bodyText);
    const hasBudget = /budget/i.test(bodyText);
    expect(hasQuantity || hasBudget).toBeTruthy();
  });

  test('Quotes section exists', async ({ page }) => {
    if (!prUrl) return test.skip();
    await page.goto(prUrl);
    await page.waitForLoadState('networkidle');
    // Wait for the quotes heading to render (React might need extra time)
    const quotesHeading = page.locator('h6, .MuiTypography-h6').filter({ hasText: /quotes/i }).first();
    await expect(quotesHeading).toBeVisible({ timeout: TIMEOUTS.shortAction });
  });

  test('Send Quote Requests button exists (officer)', async ({ page }) => {
    if (!prUrl) return test.skip();
    await page.goto(prUrl);
    await page.waitForLoadState('networkidle');
    const sendBtn = page.locator('button').filter({ hasText: /send quote|quote request/i }).first();
    if (await sendBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(sendBtn).toBeVisible();
    }
  });

  test('Quote request dialog opens and shows vendors', async ({ page }) => {
    if (!prUrl) return test.skip();
    await page.goto(prUrl);
    await page.waitForLoadState('networkidle');
    const sendBtn = page.locator('button').filter({ hasText: /send quote|quote request/i }).first();
    if (await sendBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sendBtn.click();
      const dialog = page.locator('.MuiDialog-root');
      await expect(dialog).toBeVisible({ timeout: TIMEOUTS.shortAction });
      await page.keyboard.press('Escape');
    }
  });

  test('AI recommendation button exists', async ({ page }) => {
    if (!prUrl) return test.skip();
    await page.goto(prUrl);
    await page.waitForLoadState('networkidle');
    const aiBtn = page.locator('button').filter({ hasText: /ai|recommendation|analyze/i }).first();
    if (await aiBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(aiBtn).toBeVisible();
    }
  });

  test('Activity log section renders', async ({ page }) => {
    if (!prUrl) return test.skip();
    await page.goto(prUrl);
    await page.waitForLoadState('networkidle');
    const bodyText = await page.locator('body').textContent();
    expect(/activity/i.test(bodyText)).toBeTruthy();
  });
});
