import os from 'node:os'
import path from 'node:path'
import { defineConfig } from '@playwright/test'

const baseURL = 'http://127.0.0.1:6517'

export default defineConfig({
  testDir: './e2e',
  testMatch: '*.spec.mjs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  workers: 2,
  retries: 0,
  reporter: 'list',
  outputDir: path.join(os.tmpdir(), 'yamauth-ui-e2e'),
  use: {
    baseURL,
    browserName: 'chromium',
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
    colorScheme: 'light',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    {
      name: 'notebook',
      testMatch: 'workspace.spec.mjs',
      use: { viewport: { width: 1280, height: 720 } }
    },
    {
      name: 'mobile',
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
    },
    {
      name: 'narrow',
      use: { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true }
    }
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 6517 --mode test',
    url: baseURL,
    // 不复用普通开发服务，避免本机环境变量或已有登录状态影响测试。
    reuseExistingServer: false,
    env: { VITE_API_BASE_URL: '/api' },
    timeout: 30_000
  }
})
