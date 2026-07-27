const { test, expect } = require('@playwright/test');
const { login, logout, TEST_ACCOUNTS, TIMEOUTS } = require('./helpers');

test.describe('Authentication', () => {
  test('Login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('tab', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /register/i })).toBeVisible();
    // Step 1 shows organization slug input
    await expect(page.getByLabel(/your organization/i).first()).toBeVisible({ timeout: TIMEOUTS.shortAction });
  });

  test('Demo credentials are visible', async ({ page }) => {
    await page.goto('/login');
    // New demo credentials based on the current seed data
    await expect(page.locator('text=pashupati@shivnathmill.com')).toBeVisible();
    await expect(page.locator('text=ravi@shivnathmill.com')).toBeVisible();
    await expect(page.locator('text=rikesh@shivnathmill.com')).toBeVisible();
  });

  test('Admin login redirects to /admin', async ({ page }) => {
    await login(page, 'admin');
    await expect(page).toHaveURL(/\/admin/);
  });

  test('Officer login redirects to /officer-dashboard', async ({ page }) => {
    await login(page, 'officer');
    await expect(page).toHaveURL(/\/officer-dashboard/);
  });

  test('Manager login redirects to /manager-dashboard', async ({ page }) => {
    await login(page, 'manager');
    await expect(page).toHaveURL(/\/manager-dashboard/);
  });

  test('Invalid credentials show error', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Step 1: Enter org slug and continue
    const orgInput = page.locator('input[placeholder*="e.g."]').first();
    await orgInput.fill('shivnath-mill');
    const continueBtn = page.locator('button').filter({ hasText: /continue/i });
    await continueBtn.click();
    await page.waitForTimeout(1000);

    // Step 2: Enter invalid credentials
    const emailField = page.locator('input[type="email"]').first();
    await emailField.fill('wrong@email.com');
    const passwordField = page.locator('input[type="password"]').first();
    await passwordField.fill('wrongpassword');
    const signInBtn = page.locator('button[type="submit"]').filter({ hasText: /sign in/i });
    await signInBtn.click();

    // Expect an error alert
    await expect(page.locator('.MuiAlert-root')).toBeVisible({ timeout: TIMEOUTS.shortAction });
  });

  test('Register tab switches to register form', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('tab', { name: /register/i }).click();
    await expect(page.getByLabel('Full Name')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByLabel('Organization Name')).toBeVisible();
    await expect(page.getByRole('button', { name: /create account|register/i })).toBeVisible();
  });

  test('Logout redirects to login page', async ({ page }) => {
    await login(page, 'officer');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Try direct Sign Out button in sidebar first
    let signOutBtn = page.locator('button').filter({ hasText: /sign out/i });
    if (await signOutBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await signOutBtn.first().click();
      await page.waitForURL('**/login', { timeout: TIMEOUTS.navigation });
      return;
    }

    // Click the user avatar in the header to open the account menu
    const avatarBtn = page.locator('.MuiAvatar-root').first();
    await expect(avatarBtn).toBeVisible({ timeout: TIMEOUTS.shortAction });
    await avatarBtn.click();
    await page.waitForTimeout(500);
    // Find Sign Out in the menu
    signOutBtn = page.locator('[role="menuitem"]').filter({ hasText: /sign out/i });
    await expect(signOutBtn.first()).toBeVisible({ timeout: TIMEOUTS.shortAction });
    await signOutBtn.first().click();

    // Assert redirect to login page
    await page.waitForURL('**/login', { timeout: TIMEOUTS.navigation });
  });

  test('Protected route redirects to login when not authenticated', async ({ page }) => {
    // Clear storage first to simulate unauthenticated state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.goto('/officer-dashboard');
    await page.waitForURL('**/login', { timeout: TIMEOUTS.navigation });
  });
});
