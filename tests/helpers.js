const { expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:5173';
const API_URL  = 'http://localhost:5001';

const TEST_ACCOUNTS = {
  admin:   { email: 'pashupati@shivnathmill.com', password: 'password123', role: 'admin', org: 'shivnath-mill' },
  officer: { email: 'ravi@shivnathmill.com',      password: 'password123', role: 'officer', org: 'shivnath-mill' },
  manager: { email: 'rikesh@shivnathmill.com',    password: 'password123', role: 'manager', org: 'shivnath-mill' },
};

const TIMEOUTS = {
  navigation:  15_000,
  action:      10_000,
  shortAction:  5_000,
};

async function login(page, role = 'officer') {
  const account = TEST_ACCOUNTS[role];
  await page.goto('/login');
  await page.waitForURL('**/login', { timeout: TIMEOUTS.navigation });
  await page.waitForLoadState('networkidle');

  // Step 1: Fill organization slug and click continue
  // The slug autocomplete is the first field on the login form
  const orgInput = page.locator('input[placeholder*="e.g."]').first();
  await orgInput.waitFor({ state: 'visible', timeout: TIMEOUTS.shortAction });
  await orgInput.click();
  await orgInput.fill(account.org);

  // Click the "Continue" or "Skip & Continue" button
  const continueBtn = page.locator('button').filter({ hasText: /continue/i });
  await continueBtn.waitFor({ state: 'visible', timeout: TIMEOUTS.shortAction });
  await continueBtn.click();

  // Step 2: Wait for email field (signals credentials step loaded), fill credentials
  const emailField = page.locator('input[type="email"]').first();
  await emailField.waitFor({ state: 'visible', timeout: TIMEOUTS.navigation });
  await emailField.click();
  await emailField.fill(account.email);

  const passwordField = page.locator('input[type="password"]').first();
  await passwordField.waitFor({ state: 'visible', timeout: TIMEOUTS.shortAction });
  await passwordField.click();
  await passwordField.fill(account.password);

  // Click the Sign In button
  const signInBtn = page.locator('button[type="submit"]').filter({ hasText: /sign in/i });
  await signInBtn.click();

  const dashboardPatterns = {
    admin:   '**/admin',
    officer: '**/officer-dashboard',
    manager: '**/manager-dashboard',
  };

  await page.waitForURL(dashboardPatterns[role], { timeout: 20000 });
}

async function logout(page) {
  await page.waitForLoadState('networkidle');
  const signOutBtn = page.locator('button').filter({ hasText: /sign out/i });
  if (await signOutBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
    await signOutBtn.first().click();
    await page.waitForURL('**/login', { timeout: TIMEOUTS.navigation });
    return;
  }
  // Try via user menu
  const avatarBtn = page.locator('.MuiAvatar-root').first();
  if (await avatarBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await avatarBtn.click();
    await page.waitForTimeout(500);
    const menuSignOut = page.locator('[role="menuitem"]').filter({ hasText: /sign out/i });
    if (await menuSignOut.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await menuSignOut.first().click();
      await page.waitForURL('**/login', { timeout: TIMEOUTS.navigation });
    }
  }
}

async function navigateTo(page, path) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

async function waitForToast(page, text, timeout = TIMEOUTS.shortAction) {
  const toast = page.locator(`.MuiSnackbar-root >> text="${text}"`).first();
  await expect(toast).toBeVisible({ timeout });
  return toast;
}

async function expectVisible(page, locator, timeout = TIMEOUTS.shortAction) {
  await expect(locator).toBeVisible({ timeout });
}

async function getApi(path, token) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.json();
}

module.exports = {
  BASE_URL,
  API_URL,
  TEST_ACCOUNTS,
  TIMEOUTS,
  login,
  logout,
  navigateTo,
  waitForToast,
  expectVisible,
  getApi,
};
