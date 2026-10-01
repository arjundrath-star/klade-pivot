import { defineConfig, devices } from "@playwright/test";
import { SMOKE_ADMIN_PASSWORD } from "./tests/smoke/password";

// Smoke tests run against the PRODUCTION build (scripts/gate.sh builds first).
// They boot the app, walk the core flow, and fail on any console error.
const PORT = 3100;

// A fresh, seeded database for every run. Set here so the web server and the test workers (which
// read problem seeds from it) share it. Every spec that depends on the demo student's state puts it
// back to the demo seed first (`resetDemoData`), so the specs run in any order.
process.env.DATABASE_URL = "file:./data/smoke.db";

export default defineConfig({
  testDir: "./tests/smoke",
  outputDir: "./test-results",
  timeout: 60_000,
  fullyParallel: false,
  // Every spec acts as the one demo student in one database, so spec files never run side by side.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run -s db:reset && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
    // The smoke test never calls a model: with the key empty, the coach and the grader report
    // themselves unavailable, and the test checks that state. A key in the shell or in .env.local
    // does not reach the server. The gate in front of the parent and admin views gets a password
    // the specs know.
    env: { ANTHROPIC_API_KEY: "", ADMIN_PASSWORD: SMOKE_ADMIN_PASSWORD },
  },
});
