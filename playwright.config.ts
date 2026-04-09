import { defineConfig } from '@playwright/test';

const defaultBaseUrl = process.env.PW_BASE_URL ?? 'http://127.0.0.1:3500';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [['github'], ['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']]
    : [['list']],
  use: {
    baseURL: defaultBaseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  webServer: {
    command: 'npm run dev',
    cwd: 'examples/component-gallery',
    url: defaultBaseUrl,
    // Always start a fresh server to avoid stale local runs.
    reuseExistingServer: false,
    timeout: 180_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
      },
      testIgnore: ['**/perf/**'],
    },
    {
      name: 'mobile-chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      },
      testIgnore: ['**/perf/**', '**/hot-reload-preserve.spec.ts'],
    },
    {
      name: 'perf-chromium',
      use: {
        browserName: 'chromium',
      },
      testMatch: ['**/perf/**/*.spec.ts'],
    },
  ],
});
