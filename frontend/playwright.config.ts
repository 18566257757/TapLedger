import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.TAPLEDGER_E2E_URL ?? 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
  },
  webServer: process.env.TAPLEDGER_E2E_URL ? undefined : {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173',
    url: 'http://127.0.0.1:5173/api/v1/health',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      CLOUDFLARE_VITE_WRANGLER_CONFIG_PATH: '../wrangler.jsonc',
      XDG_CONFIG_HOME: path.resolve('..', '.wrangler', 'config'),
      WRANGLER_SEND_METRICS: 'false',
    },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'iphone', use: { ...devices['iPhone 14'] } },
  ],
})
