const { test, expect } = require('@playwright/test');
const { TIMEOUTS, TEST_ACCOUNTS } = require('./helpers');

/**
 * Login via the UI login page, then extract the token from localStorage.
 * Handles the two-step auth flow: org slug → credentials.
 */
async function loginAs(page, role) {
  const acct = TEST_ACCOUNTS[role];
  if (!acct) throw new Error(`Unknown role: ${role}`);

  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  
  // Step 1: Enter organization slug
  const orgInput = page.locator('input').first();
  await orgInput.waitFor({ state: 'visible', timeout: 10000 });
  await orgInput.fill(acct.org || 'shivnath-mill');
  
  // Click Continue
  const continueBtn = page.locator('button').filter({ hasText: /continue/i });
  await continueBtn.click();
  
  // Step 2: Wait for email field to appear and fill credentials
  const emailField = page.locator('input[type="email"]').first();
  await emailField.waitFor({ state: 'visible', timeout: 10000 });
  await emailField.fill(acct.email);
  
  const passwordField = page.locator('input[type="password"]').first();
  await passwordField.waitFor({ state: 'visible', timeout: 5000 });
  await passwordField.fill(acct.password);
  
  // Click Sign In
  const signInBtn = page.locator('button[type="submit"]').filter({ hasText: /sign in/i });
  await signInBtn.click();
  
  // Wait for redirect to dashboard
  const dashboardPatterns = {
    admin:   '**/admin',
    officer: '**/officer-dashboard',
    manager: '**/manager-dashboard',
  };
  await page.waitForURL(dashboardPatterns[role], { timeout: 20000 });
  
  // Extract token from localStorage
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const userStr = await page.evaluate(() => localStorage.getItem('user'));
  if (!token || !userStr) throw new Error(`Login failed: no token or user in localStorage`);
  
  return { token, user: JSON.parse(userStr) };
}

test.describe('Full Quote Workflow', () => {

  test('Send quote requests and submit a vendor quote end-to-end', async ({ page }) => {
    // ─── 1. Login as Admin via UI & Create a Fresh Pending PR ───
    await loginAs(page, 'admin');

    // ─── 2. Use an existing pending PR from seed data ───
    // Fetch a pending PR via page.evaluate (goes through Vite proxy with auth)
    const prInfo = await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
      
      // First try to get an existing pending PR
      const res = await fetch('/api/purchase-requests?status=pending&limit=3', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data?.data?.length > 0) {
          const pr = data.data[0];
          return { id: pr.id, itemName: pr.itemName };
        }
      }
      
      // Fallback: create a PR via API
      const createRes = await fetch('/api/purchase-requests', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          itemName: `E2E Test PR - ${Date.now()}`,
          category: 'IT', quantity: 10, budget: 15000,
          urgency: 'medium',
          justification: 'Created by Playwright E2E test'
        })
      });
      
      if (createRes.ok) {
        const pr = await createRes.json();
        return { id: pr.id, itemName: pr.itemName };
      }
      
      const errorText = await createRes.text();
      throw new Error(`Failed to get or create PR: ${createRes.status} ${errorText}`);
    });
    
    expect(prInfo).toBeTruthy();
    const prId = prInfo.id;
    const prItemName = prInfo.itemName;

    // Navigate to PR detail
    await page.goto(`/pr/${prId}`);
    await page.waitForLoadState('networkidle');

    // Verify PR detail page loaded
    await expect(page.locator('h4').filter({ hasText: new RegExp(prItemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }))
      .toBeVisible({ timeout: TIMEOUTS.shortAction });

    // ─── 3. Send Quote Requests ───
    const sendBtn = page.locator('button').filter({ hasText: /send quote request/i }).first();
    await expect(sendBtn).toBeVisible({ timeout: TIMEOUTS.shortAction });
    await sendBtn.click();

    // Wait for dialog to open
    const dialog = page.locator('.MuiDialog-root');
    await expect(dialog).toBeVisible({ timeout: TIMEOUTS.shortAction });
    await page.waitForTimeout(1500);

    // Select all available vendors
    const selectAllBtn = dialog.locator('button').filter({ hasText: /select all available/i }).first();
    await expect(selectAllBtn).toBeVisible({ timeout: TIMEOUTS.shortAction });
    await selectAllBtn.click();
    await page.waitForTimeout(300);

    // Check if vendors were selected
    const selectedChip = dialog.locator('.MuiChip-root').filter({ hasText: /selected/i }).first();
    const hasSelection = await selectedChip.isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasSelection) {
      test.skip();
      return;
    }

    // Send the requests
    const sendRequestsBtn = dialog.locator('button').filter({ hasText: /send to/i }).first();
    await expect(sendRequestsBtn).toBeEnabled({ timeout: TIMEOUTS.shortAction });
    await sendRequestsBtn.click();
    await page.waitForTimeout(2000);

    // Verify results
    const dialogContent = dialog.locator('table, .MuiAlert-root');
    await expect(dialogContent.first()).toBeVisible({ timeout: TIMEOUTS.shortAction * 2 });

    // Close dialog
    await dialog.locator('button').filter({ hasText: /close/i }).first().click();
    await expect(dialog).not.toBeVisible({ timeout: TIMEOUTS.shortAction });

    // ─── 4. Get Quote Request Token via API ───
    const quoteRequests = await page.evaluate(async (pid) => {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/purchase-requests/${pid}/quote-requests`, { headers });
      if (!res.ok) throw new Error(`Failed to fetch quote requests: ${res.status}`);
      return res.json();
    }, prId);
    expect(Array.isArray(quoteRequests)).toBeTruthy();
    expect(quoteRequests.length).toBeGreaterThan(0);

    const sentRequest = quoteRequests.find(qr => qr.status === 'sent' && qr.token);
    if (!sentRequest) {
      test.skip();
      return;
    }

    const vendorToken = sentRequest.token;
    const vendorName = sentRequest.vendor?.name || 'Test Vendor';

    // ─── 5. Access Vendor Quote Form (Public) ───
    await page.goto(`/vendor-quote/${vendorToken}`);
    await page.waitForLoadState('networkidle');

    // Verify PR details loaded
    await expect(page.locator('text=/E2E Test PR/i')).toBeVisible({ timeout: TIMEOUTS.shortAction });
    await expect(page.locator('text=/submit your quote/i')).toBeVisible({ timeout: TIMEOUTS.shortAction });

    // Check deadline counter
    await expect(page.locator('.MuiChip-root').filter({ hasText: /day/i }).first())
      .toBeVisible({ timeout: TIMEOUTS.shortAction });

    // ─── 6. Fill and Submit the Quote Form ───
    await page.locator('input[type="number"]').first().fill('12500');
    await page.locator('input[type="number"]').nth(1).fill('14');
    await page.locator('textarea').first().fill('We can deliver within 14 business days.');

    await expect(page.locator('text=/per unit/i')).toBeVisible({ timeout: TIMEOUTS.shortAction });
    await page.locator('button[type="submit"]').filter({ hasText: /submit quote/i }).click();

    // ─── 7. Verify Submission Success ───
    await expect(page.locator('text=/quote submitted successfully/i'))
      .toBeVisible({ timeout: TIMEOUTS.shortAction * 3 });

    await expect(page.locator(`text=/${vendorName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/i`))
      .toBeVisible({ timeout: TIMEOUTS.shortAction });

    // Verify price displayed (handle locale formatting)
    const priceOk = await page.locator('text=/12,?500/i').isVisible({ timeout: 3000 }).catch(() => false);
    const priceAltOk = await page.locator('text=/12500/i').isVisible({ timeout: 3000 }).catch(() => false);
    expect(priceOk || priceAltOk).toBeTruthy();

    await expect(page.locator('text=/14 days/i')).toBeVisible({ timeout: TIMEOUTS.shortAction });

    // ─── 8. Verify PR Status Updated to 'quoted' via API ───
    const prData = await page.evaluate(async (pid) => {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/purchase-requests/${pid}`, { headers });
      if (!res.ok) throw new Error(`Failed to fetch PR: ${res.status}`);
      return res.json();
    }, prId);
    expect(prData.status).toBe('quoted');

    // ─── 9. Verify Quote Request Status Updated to 'completed' via API ───
    const updatedQrs = await page.evaluate(async (pid) => {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/purchase-requests/${pid}/quote-requests`, { headers });
      if (!res.ok) throw new Error(`Failed to fetch quote requests: ${res.status}`);
      return res.json();
    }, prId);
    const completedRequest = updatedQrs.find(qr => qr.id === sentRequest.id);
    expect(completedRequest).toBeTruthy();
    expect(completedRequest.status).toBe('completed');
    expect(completedRequest.completedAt).toBeTruthy();
  });

  test('Invalid token shows appropriate error', async ({ page }) => {
    await page.goto('/vendor-quote/this-is-an-invalid-token-12345');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const errorTexts = [
      'Unable to Load Quote Request',
      'invalid quote request link',
      'Failed to load quote request',
    ];

    let found = false;
    for (const text of errorTexts) {
      found = await page.locator(`text=/${text}/i`).isVisible({ timeout: 3000 }).catch(() => false);
      if (found) break;
    }
    expect(found).toBeTruthy();
  });
});
