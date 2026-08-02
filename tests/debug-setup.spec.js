const { test: setup } = require('@playwright/test');
const { TEST_ACCOUNTS } = require('./helpers');
const path = require('path');
const fs = require('fs');

const STORAGE_DIR = path.join(__dirname, '.auth');
const API_URL = 'http://localhost:5001';

setup('authenticate as officer', async ({ page }) => {
  const account = TEST_ACCOUNTS['officer'];
  const res = await page.request.post(`${API_URL}/api/auth/login`, {
    data: { email: account.email, password: account.password },
  });
  const { token, user } = await res.json();

  await page.goto('/');
  await page.evaluate(({ token, user, path }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    window.location.href = path;
  }, { token, user, path: '/officer-dashboard' });
  await page.waitForURL('**/officer-dashboard', { timeout: 30000 });
  await page.waitForLoadState('networkidle');

  await page.context().storageState({ path: path.join(STORAGE_DIR, 'officer.json') });
  
  const state = JSON.parse(fs.readFileSync(path.join(STORAGE_DIR, 'officer.json'), 'utf8'));
  console.log('After save - cookies:', state.cookies.length, 'origins:', state.origins.length);
  console.log('First origin:', JSON.stringify(state.origins[0]));
});
