import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: 0,
  reporter: [['list']],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // dev 서버 3개(pnpm dev)가 떠 있어야 한다. 없으면 여기서 기동.
  webServer: process.env.E2E_NO_SERVER ? undefined : [
    { command: 'pnpm --filter @glowuprizz/api dev', url: 'http://localhost:3001/docs', reuseExistingServer: true, timeout: 60_000, cwd: path.resolve(__dirname, '../..') },
    { command: 'pnpm --filter @glowuprizz/forms dev', url: 'http://127.0.0.1:3002/healthz', reuseExistingServer: true, timeout: 60_000, cwd: path.resolve(__dirname, '../..') },
    { command: 'pnpm --filter @glowuprizz/web dev', url: 'http://localhost:3000/login', reuseExistingServer: true, timeout: 90_000, cwd: path.resolve(__dirname, '../..') },
  ],
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
