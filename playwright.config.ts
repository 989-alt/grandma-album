import { defineConfig, devices } from '@playwright/test';

// 빌드 산출물(HTML 1개)을 그대로 띄워 완주한다. 포트는 grandma-album 전용 4183(4173·4174 는 다른 프로젝트가 씀).
// VITE_E2E=1 빌드만 디버그 진입(?screen=)·window.__album 을 넣는다(배포 빌드엔 없음).
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 10 * 60_000,
  workers: 1,
  use: { baseURL: 'http://localhost:4183', viewport: { width: 1024, height: 768 } },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 768 } } }],
  webServer: {
    command: 'VITE_E2E=1 npm run build && npm run preview -- --port 4183 --strictPort',
    url: 'http://localhost:4183',
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
