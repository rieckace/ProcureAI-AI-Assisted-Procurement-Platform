const { test } = require('@playwright/test');
const { TIMEOUTS } = require('./helpers');

test.describe('Debug Officer Dashboard', () => {
  test('Check auth state', async ({ page }) => {
    await page.goto('/officer-dashboard');
    await page.waitForLoadState('networkidle');
    const bodyText = await page.locator('body').textContent();
    console.log('BODY TEXT LENGTH:', bodyText.length);
    console.log('HAS ALL REQUESTS:', bodyText.includes('All Purchase Requests'));
    console.log('HAS WELCOME:', bodyText.includes('Welcome to ProcureAI'));
    console.log('HAS SIGN IN:', bodyText.includes('Sign In'));
  });
});
