const { test: setup } = require('@playwright/test');
const { TEST_ACCOUNTS } = require('./helpers');
const path = require('path');

const STORAGE_DIR = path.join(__dirname, '.auth');
const API_URL = 'http://localhost:5001';

setup.describe('Authentication Setup', () => {
  setup('authenticate as admin', async ({ page }) => {
    await authenticateViaAPI(page, 'admin');
    await page.context().storageState({ path: path.join(STORAGE_DIR, 'admin.json') });
  });

  setup('authenticate as officer', async ({ page }) => {
    await authenticateViaAPI(page, 'officer');
    await page.context().storageState({ path: path.join(STORAGE_DIR, 'officer.json') });
  });

  setup('authenticate as manager', async ({ page }) => {
    await authenticateViaAPI(page, 'manager');
    await page.context().storageState({ path: path.join(STORAGE_DIR, 'manager.json') });
  });
});

async function authenticateViaAPI(page, role) {
  const account = TEST_ACCOUNTS[role];

  const loginResponse = await page.request.post(`${API_URL}/api/auth/login`, {
    data: { email: account.email, password: account.password },
  });
  const { token, user } = await loginResponse.json();

  const dashboardPaths = {
    admin: '/admin',
    officer: '/officer-dashboard',
    manager: '/manager-dashboard',
  };

  await page.goto('/');
  await page.evaluate(({ token, user, path }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    window.location.href = path;
  }, { token, user, path: dashboardPaths[role] });
  await page.waitForURL(`**${dashboardPaths[role]}`, { timeout: 30000 });
  await page.waitForLoadState('networkidle');
}
