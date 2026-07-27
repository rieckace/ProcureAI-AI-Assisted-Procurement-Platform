const { defineConfig } = require('@playwright/test');
const path = require('path');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 30_000,
  expect: { timeout: 5000 },

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.js/,
    },
    {
      name: 'auth',
      testMatch: /auth\.spec\.js/,
      dependencies: ['setup'],
    },
    {
      name: 'officer',
      testMatch: /officer-flow|vendor-management|pr-detail|chatbot|quote-workflow/,
      dependencies: ['setup'],
      use: {
        storageState: path.join(__dirname, 'tests', '.auth', 'officer.json'),
      },
    },
    {
      name: 'manager',
      testMatch: /manager-flow/,
      dependencies: ['setup'],
      use: {
        storageState: path.join(__dirname, 'tests', '.auth', 'manager.json'),
      },
    },
    {
      name: 'admin',
      testMatch: /admin-flow/,
      dependencies: ['setup'],
      use: {
        storageState: path.join(__dirname, 'tests', '.auth', 'admin.json'),
      },
    },
    {
      name: 'unauthenticated',
      testMatch: /landing|vendor-quote-form/,
      dependencies: ['setup'],
    },
    {
      name: 'shared',
      testMatch: /navigation|analytics|responsive/,
      dependencies: ['setup'],
      use: {
        storageState: path.join(__dirname, 'tests', '.auth', 'officer.json'),
      },
    },
  ],
});
