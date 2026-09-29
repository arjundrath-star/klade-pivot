import { defineConfig, devices } from "@playwright/test";

// Smoke tests run against the PRODUCTION build (scripts/gate.sh builds first).
// They boot the app, walk the core flow, and fail on any console error.
const PORT = 3100;

export default defineConfig({
  testDir: "./tests/smoke",
  outputDir: "./test-results",
  timeout: 60_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
