const { test, expect } = require('@playwright/test');
const { TIMEOUTS } = require('./helpers');

test.describe('Chatbot Widget', () => {
  test('Chat FAB button is visible', async ({ page }) => {
    await page.goto('/officer-dashboard');
    await page.waitForLoadState('networkidle');
    const chatFab = page.getByRole('button', { name: /open chat/i }).first();
    await expect(chatFab).toBeVisible({ timeout: TIMEOUTS.shortAction });
  });

  test('Chat widget opens on click and has input', async ({ page }) => {
    await page.goto('/officer-dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const chatFab = page.getByRole('button', { name: /open chat/i }).first();
    await chatFab.click();
    await page.waitForTimeout(500);
    const chatInput = page.getByPlaceholder(/procura|message|ask/i).first();
    await expect(chatInput).toBeVisible({ timeout: TIMEOUTS.shortAction });
  });

  test('Chat input accepts text', async ({ page }) => {
    await page.goto('/officer-dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const chatFab = page.getByRole('button', { name: /open chat/i }).first();
    await chatFab.click();
    const chatInput = page.getByPlaceholder(/procura|message|ask/i).first();
    await expect(chatInput).toBeVisible({ timeout: TIMEOUTS.shortAction });
    await chatInput.fill('What procurement policies apply?');
    await expect(chatInput).toHaveValue('What procurement policies apply?');
  });

  test('Chat welcome message renders', async ({ page }) => {
    await page.goto('/officer-dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const chatFab = page.getByRole('button', { name: /open chat/i }).first();
    await chatFab.click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=/procura|assistant|help|welcome/i').first()).toBeVisible({ timeout: TIMEOUTS.shortAction });
  });
});
