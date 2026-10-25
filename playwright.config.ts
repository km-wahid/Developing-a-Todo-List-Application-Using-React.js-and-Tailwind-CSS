import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  use: {
    baseURL: 'http://localhost:5173',
    ...(process.env.BROWSER_EXECUTABLE
      ? { launchOptions: { executablePath: process.env.BROWSER_EXECUTABLE } }
      : {}),
  },
  webServer:
    process.env.BROWSER_ARTIFACTS === 'true'
      ? undefined
      : {
          command: 'npm run dev',
          url: 'http://localhost:5173',
          reuseExistingServer: !process.env.CI,
          timeout: 60000,
        },
})
