const { test } = require('@playwright/test');
const path = require('path');

test('Debug manager dashboard', async ({ page }) => {
  const context = await page.browser().newContext({
    storageState: path.join(__dirname, 'tests', '.auth', 'manager.json'),
  });
  const p = await context.newPage();
  await p.goto('/manager-dashboard');
  await p.waitForLoadState('networkidle');
  await p.waitForTimeout(2000);
  await p.screenshot({ path: 'manager-dashboard.png', fullPage: true });
  const html = await p.content();
  console.log('HTML length:', html.length);
  console.log('Contains My Purchase:', html.includes('My Purchase'));
  console.log('Contains login:', html.includes('Sign In'));
  await p.close();
  await context.close();
});
