import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5178';
const apiURL = process.env.E2E_API_BASE_URL ?? 'http://localhost:8081/api/v1';
for (const value of [baseURL, apiURL]) {
  const url = new URL(value);
  if (url.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new Error('E2E requires disposable loopback servers, never production.');
  }
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: { baseURL, locale: 'es-PE', trace: 'off', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --host localhost --port ${new URL(baseURL).port || '5178'} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    env: { VITE_API_BASE_URL: apiURL },
    timeout: 60_000,
  },
});
