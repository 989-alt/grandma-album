import { defineConfig, devices } from '@playwright/test';

// 빌드 산출물(HTML 1개)을 그대로 띄워 완주한다. 포트는 world-trade(4173)와 겹치지 않게 4174.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 10 * 60_000,
  workers: 1,
  use: { baseURL: 'http://localhost:4174', viewport: { width: 1024, height: 768 } },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 768 } } }],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4174 --strictPort',
    url: 'http://localhost:4174',
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
